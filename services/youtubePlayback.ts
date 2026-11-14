import type { MusicTrack } from "../types/music";
import { resolveWithNewPipe } from "./newPipeResolver";
import { resolveYouTubePoTokens } from "./poTokenResolver";

export type ResolvedYouTubeAudio = {
  url: string;
  mimeType: string;
  durationSeconds: number;
  bitrate?: number;
  userAgent: string;
  expiresAt: number;
};

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

// Cache resolved stream URLs in memory so replaying or seeking doesn't re-fetch before expiration
const streamCache = new Map<string, ResolvedYouTubeAudio>();
const MAX_STREAM_CACHE_ENTRIES = 40;

function getCachedStream(videoId: string) {
  const cached = streamCache.get(videoId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now() + 5 * 60 * 1000) {
    streamCache.delete(videoId);
    return null;
  }
  // Refresh insertion order so frequently replayed tracks remain in the cache.
  streamCache.delete(videoId);
  streamCache.set(videoId, cached);
  return cached;
}

function cacheStream(videoId: string, stream: ResolvedYouTubeAudio) {
  streamCache.delete(videoId);
  streamCache.set(videoId, stream);
  while (streamCache.size > MAX_STREAM_CACHE_ENTRIES) {
    const oldestKey = streamCache.keys().next().value;
    if (!oldestKey) break;
    streamCache.delete(oldestKey);
  }
}

async function resolvePoTokenQuickly(videoId: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolveYouTubePoTokens(videoId),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 2500);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * InnerTube client profiles that return direct, unthrottled adaptive audio URLs
 * without requiring a browser JS signature decipherer or external yt-dlp server.
 */
const INNERTUBE_PLAYER_CLIENTS = [
  // VISIONOS currently returns direct, pre-signed media URLs without requiring
  // a PO token or JavaScript signature deciphering. Keep the existing clients
  // below as fallbacks in case YouTube changes this route.
  {
    name: "VISIONOS",
    clientId: "101",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    context: {
      client: {
        clientName: "VISIONOS",
        clientVersion: "1.02",
        deviceMake: "Apple",
        deviceModel: "RealityDevice17,1",
        osName: "visionOS",
        osVersion: "26.5.23O471",
        hl: "en",
        gl: "US"
      }
    }
  },
  {
    name: "IOS",
    clientId: "5",
    userAgent:
      "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.45.4",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "18.1.0.22B83",
        hl: "en",
        gl: "US"
      }
    }
  },
  {
    name: "ANDROID_VR",
    clientId: "28",
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 14; en_US; Quest 3; Build/UP1A.231005.007.A1; Cronet/132.0.6808.3)",
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.60.19",
        androidSdkVersion: 34,
        osName: "Android",
        osVersion: "14",
        deviceMake: "Oculus",
        deviceModel: "Quest 3",
        hl: "en",
        gl: "US"
      }
    }
  },
  {
    name: "ANDROID_TESTSUITE",
    clientId: "30",
    userAgent:
      "com.google.android.youtube/1.9 (Linux; U; Android 14; en_US)",
    context: {
      client: {
        clientName: "ANDROID_TESTSUITE",
        clientVersion: "1.9",
        androidSdkVersion: 34,
        osName: "Android",
        osVersion: "14",
        hl: "en",
        gl: "US"
      }
    }
  }
] as const;

export function extractYouTubeVideoId(track: MusicTrack): string {
  if (track.youtubeVideoId?.trim()) return track.youtubeVideoId.trim();
  if (track.sourceTrackId?.trim()) return track.sourceTrackId.replace(/^youtube:/i, "").trim();
  if (track.id.startsWith("youtube:")) return track.id.slice("youtube:".length).trim();

  if (track.youtubeUrl) {
    const match = track.youtubeUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match?.[1]) return match[1];
  }
  return "";
}

/**
 * Resolves a playable audio stream directly through YouTube's InnerTube /player API.
 * Keeps InnerTube as the primary resolver and falls back to NewPipe on Android only if all InnerTube clients fail.
 */
export async function resolveYouTubeMusicAudio(track: MusicTrack, forceRefresh = false): Promise<ResolvedYouTubeAudio> {
  const videoId = extractYouTubeVideoId(track);
  if (!videoId) {
    throw new Error("Missing YouTube video ID for this track.");
  }

  // Check if we already have a non-expired stream URL cached (with 5-min safety buffer)
  if (forceRefresh) streamCache.delete(videoId);
  const cached = forceRefresh ? null : getCachedStream(videoId);
  if (cached) return cached;

  const errors: string[] = [];
  // Race the profiles and use the first successful playable stream.
  // Promise.allSettled would wait for every slow/failing client before returning.
  const controllers: AbortController[] = [];
  const profileAttempts = INNERTUBE_PLAYER_CLIENTS.map(async (profile) => {
    const controller = new AbortController();
    controllers.push(controller);
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(PLAYER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": profile.userAgent,
          "X-YouTube-Client-Name": profile.clientId,
          "X-YouTube-Client-Version": profile.context.client.clientVersion,
          Origin: "https://www.youtube.com"
        },
        body: JSON.stringify({
          context: profile.context,
          videoId,
          racyCheckOk: true,
          contentCheckOk: true
        })
      });
      if (!response.ok) throw new Error(`${profile.name}: HTTP ${response.status}`);
      const payload: Record<string, any> = await response.json();
      const status = payload?.playabilityStatus?.status;
      if (status !== "OK") {
        const reason = payload?.playabilityStatus?.reason || status || "Unavailable";
        throw new Error(`${profile.name}: ${String(reason)}`);
      }

      const streamingData = payload?.streamingData;
      const adaptiveFormats: Record<string, any>[] = Array.isArray(streamingData?.adaptiveFormats) ? streamingData.adaptiveFormats : [];
      const formats: Record<string, any>[] = Array.isArray(streamingData?.formats) ? streamingData.formats : [];
      const audioStreams = [...adaptiveFormats, ...formats].filter((fmt) =>
        typeof fmt?.url === "string" && fmt.url.length > 0 &&
        typeof fmt?.mimeType === "string" && fmt.mimeType.startsWith("audio/")
      );
      audioStreams.sort((a, b) => {
        const aIsMp4 = a.mimeType.includes("audio/mp4") ? 1 : 0;
        const bIsMp4 = b.mimeType.includes("audio/mp4") ? 1 : 0;
        if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
        return Number(b.bitrate || 0) - Number(a.bitrate || 0);
      });
      const bestFormat = audioStreams[0];
      const hlsManifestUrl: string | undefined = streamingData?.hlsManifestUrl;
      if (!bestFormat && !hlsManifestUrl) throw new Error(`${profile.name}: no direct audio stream URL`);

      const expiresInSeconds = Number(streamingData?.expiresInSeconds || 21500);
      const durationFromPlayer = Number(payload?.videoDetails?.lengthSeconds || 0);
      const durationFromFormat = bestFormat?.approxDurationMs ? Math.round(Number(bestFormat.approxDurationMs) / 1000) : 0;
      const fallbackDuration = Math.max(0, Math.round((track.durationMs || 0) / 1000));
      return {
        url: bestFormat ? bestFormat.url : hlsManifestUrl!,
        mimeType: bestFormat ? bestFormat.mimeType : "application/x-mpegURL",
        durationSeconds: durationFromPlayer || durationFromFormat || fallbackDuration,
        bitrate: bestFormat ? Number(bestFormat.bitrate || 128000) : undefined,
        userAgent: profile.userAgent,
        expiresAt: Date.now() + expiresInSeconds * 1000
      } satisfies ResolvedYouTubeAudio;
    } finally {
      clearTimeout(timeout);
    }
  });

  let resolvedStream: ResolvedYouTubeAudio;
  try {
    resolvedStream = await Promise.any(profileAttempts);
    // Stop redundant client requests as soon as one profile supplies a stream.
    controllers.forEach((controller) => controller.abort());
  } catch (error) {
    const failures = error instanceof AggregateError
      ? error.errors.map((item) => item instanceof Error ? item.message : String(item))
      : [error instanceof Error ? error.message : String(error)];
    errors.push(...failures);
    resolvedStream = null as unknown as ResolvedYouTubeAudio;
  }
  if (resolvedStream) {
    cacheStream(videoId, resolvedStream);
    return resolvedStream;
  }

  // Android fallback: NewPipe uses its own extraction implementation.
  // The InnerTube clients above remain the primary path and are never modified
  // or bypassed when one of them returns a playable stream.
  try {
    const newPipeResult = await resolveWithNewPipe(videoId);
    if (newPipeResult?.url) {
      const expiryMatch = newPipeResult.url.match(/[?&]expire=(\d+)/);
      const parsedExpiry = expiryMatch?.[1] ? Number(expiryMatch[1]) * 1000 : 0;
      const newPipeUrl = new URL(newPipeResult.url);
      // PoTokens are optional and only requested for the Android extraction
      // fallback. A slow or unavailable BotGuard WebView never blocks playback.
      const poToken = await resolvePoTokenQuickly(videoId);
      if (poToken && poToken.expiresAt > Date.now() + 30_000) {
        newPipeUrl.searchParams.set("pot", poToken.contentToken);
      }
      const resolved: ResolvedYouTubeAudio = {
        url: newPipeUrl.toString(),
        mimeType: newPipeResult.mimeType || "audio/*",
        durationSeconds:
          newPipeResult.durationSeconds ||
          Math.max(0, Math.round((track.durationMs || 0) / 1000)),
        bitrate: newPipeResult.bitrate > 0 ? newPipeResult.bitrate : undefined,
        userAgent: newPipeResult.userAgent,
        expiresAt: parsedExpiry > Date.now()
          ? parsedExpiry
          : Date.now() + 30 * 60 * 1000
      };
      cacheStream(videoId, resolved);
      return resolved;
    }
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : `NewPipe: ${String(error)}`
    );
  }

  throw new Error(
    `Could not stream "${track.title}". (${errors.join(" | ") || "No playable stream"})`
  );
}