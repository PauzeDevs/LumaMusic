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
// Stream URLs are large signed strings. Keep only a short LRU window for the current listening session.
const MAX_STREAM_CACHE_ENTRIES = 8;
// Coalesce playlist prefetch and foreground playback requests for the same video.
const inFlightResolutions = new Map<string, Promise<ResolvedYouTubeAudio>>();
const resolutionVersions = new Map<string, number>();

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
  // Let the resolver own the timeout so a timed-out optional request also
  // unmounts its heavyweight WebView instead of leaving Chromium alive.
  return resolveYouTubePoTokens(videoId, 2500);
}

/**
 * NewPipe resolves YouTube's signed and throttled stream URLs before returning
 * them. Prefer it on Android; the InnerTube shortcut is retained as fallback.
 */
async function resolveNewPipeStream(videoId: string, track: MusicTrack): Promise<ResolvedYouTubeAudio | null> {
  const result = await resolveWithNewPipe(videoId);
  if (!result?.url) return null;

  const url = new URL(result.url);
  const expiry = Number(url.searchParams.get("expire") || 0) * 1000;
  const poToken = await resolvePoTokenQuickly(videoId);
  if (poToken && poToken.expiresAt > Date.now() + 30_000) {
    url.searchParams.set("pot", poToken.contentToken);
  }

  return {
    url: url.toString(),
    mimeType: result.mimeType || "audio/*",
    durationSeconds: result.durationSeconds > 0
      ? result.durationSeconds
      : Math.max(0, Math.round((track.durationMs || 0) / 1000)),
    bitrate: result.bitrate > 0 ? result.bitrate : undefined,
    userAgent: result.userAgent,
    expiresAt: expiry > Date.now() ? expiry : Date.now() + 30 * 60 * 1000
  };
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
      "com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)",
    context: {
      client: {
        clientName: "VISIONOS",
        clientVersion: "1.04",
        deviceMake: "Apple",
        deviceModel: "RealityDevice17,1",
        osName: "visionOS",
        osVersion: "26.6.0.23O770",
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
 * Resolves a playable YouTube audio stream. Android uses NewPipe first so signed
 * and throttled URLs are deciphered; InnerTube client profiles remain fallback.
 */
async function resolveYouTubeMusicAudioUncached(track: MusicTrack, videoId: string): Promise<ResolvedYouTubeAudio> {
  const errors: string[] = [];

  // Prefer NewPipe on Android. It resolves YouTube signature and n-parameter
  // transformations before returning a media URL. An undeciphered URL can be
  // throttled and may stop delivering bytes before the track is complete.
  try {
    const newPipeStream = await resolveNewPipeStream(videoId, track);
    if (newPipeStream) {
      return newPipeStream;
    }
  } catch (error) {
    errors.push(error instanceof Error ? `NewPipe: ${error.message}` : `NewPipe: ${String(error)}`);
  }

  // InnerTube remains the fallback when native extraction is unavailable.
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
      const hlsManifestUrl: string | undefined = typeof streamingData?.hlsManifestUrl === "string"
        ? streamingData.hlsManifestUrl
        : undefined;
      const dashManifestUrl: string | undefined = typeof streamingData?.dashManifestUrl === "string"
        ? streamingData.dashManifestUrl
        : undefined;
      const manifestUrl = hlsManifestUrl || dashManifestUrl;
      if (!bestFormat && !manifestUrl) throw new Error(`${profile.name}: no direct audio stream or supported manifest URL`);

      const expiresInSeconds = Number(streamingData?.expiresInSeconds || 21500);
      const durationFromPlayer = Number(payload?.videoDetails?.lengthSeconds || 0);
      const durationFromFormat = bestFormat?.approxDurationMs ? Math.round(Number(bestFormat.approxDurationMs) / 1000) : 0;
      const fallbackDuration = Math.max(0, Math.round((track.durationMs || 0) / 1000));
      return {
        url: bestFormat ? bestFormat.url : manifestUrl!,
        mimeType: bestFormat ? bestFormat.mimeType : hlsManifestUrl ? "application/x-mpegURL" : "application/dash+xml",
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
    return resolvedStream;
  }

  throw new Error(
    `Could not stream "${track.title}". (${errors.join(" | ") || "No playable stream"})`
  );
}

/**
 * Resolve once per video when possible. A forced retry starts a fresh lookup;
 * version guards prevent an older, slower request from overwriting its cache.
 */
export async function resolveYouTubeMusicAudio(track: MusicTrack, forceRefresh = false): Promise<ResolvedYouTubeAudio> {
  const videoId = extractYouTubeVideoId(track);
  if (!videoId) throw new Error("Missing YouTube video ID for this track.");

  if (forceRefresh) {
    streamCache.delete(videoId);
  } else {
    const cached = getCachedStream(videoId);
    if (cached) return cached;
    const pending = inFlightResolutions.get(videoId);
    if (pending) return pending;
  }

  const version = (resolutionVersions.get(videoId) ?? 0) + 1;
  resolutionVersions.set(videoId, version);
  const request = resolveYouTubeMusicAudioUncached(track, videoId)
    .then((stream) => {
      if (resolutionVersions.get(videoId) === version) cacheStream(videoId, stream);
      return stream;
    })
    .finally(() => {
      if (inFlightResolutions.get(videoId) === request) inFlightResolutions.delete(videoId);
    });

  inFlightResolutions.set(videoId, request);
  return request;
}
