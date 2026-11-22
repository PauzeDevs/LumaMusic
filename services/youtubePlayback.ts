import type { MusicTrack } from "../types/music";
import { usePreferencesStore } from "../store/preferences";
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
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_STREAM_DURATION_SECONDS = 24 * 60 * 60;

function validateStreamUrl(rawUrl: unknown, label: string): string {
  if (typeof rawUrl !== "string" || rawUrl.length > 16_384) {
    throw new Error(`${label}: invalid stream URL`);
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label}: malformed stream URL`);
  }
  const host = parsed.hostname.toLowerCase();
  const trustedHost = host === "googlevideo.com" || host.endsWith(".googlevideo.com") ||
    host === "youtube.com" || host.endsWith(".youtube.com");
  if (parsed.protocol !== "https:" || !trustedHost || parsed.username || parsed.password) {
    throw new Error(`${label}: rejected untrusted stream URL`);
  }
  return parsed.toString();
}

function safeDuration(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_STREAM_DURATION_SECONDS) return fallback;
  return Math.round(parsed);
}

function boundedExpiry(candidate: unknown, fallbackMs = 30 * 60 * 1000): number {
  const now = Date.now();
  const parsed = Number(candidate);
  const fallback = now + Math.min(Math.max(fallbackMs, 60_000), 24 * 60 * 60 * 1000);
  if (!Number.isFinite(parsed) || parsed < now + 60_000) return fallback;
  return Math.min(parsed, now + 24 * 60 * 60 * 1000);
}

function safeBitrate(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000
    ? Math.round(parsed)
    : undefined;
}

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
async function resolveNewPipeStream(videoId: string, track: MusicTrack, signal?: AbortSignal): Promise<ResolvedYouTubeAudio | null> {
  const result = await resolveWithNewPipe(videoId, signal);
  if (!result?.url) return null;

  const validatedUrl = validateStreamUrl(result.url, "NewPipe");
  const url = new URL(validatedUrl);
  const expiry = Number(url.searchParams.get("expire") || 0) * 1000;
  // PO tokens are optional for this direct-stream route. Resolve them in the
  // background so WebView startup never delays the first audio request.
  void resolvePoTokenQuickly(videoId).catch(() => null);

  return {
    url: url.toString(),
    mimeType: result.mimeType || "audio/*",
    durationSeconds: safeDuration(result.durationSeconds, safeDuration((track.durationMs || 0) / 1000)),
    bitrate: safeBitrate(result.bitrate),
    userAgent: typeof result.userAgent === "string" && result.userAgent.length <= 512 ? result.userAgent : "Mozilla/5.0",
    expiresAt: boundedExpiry(expiry)
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

  // Give NewPipe a short head start. On timeout, abort the native extraction
  // so its active HTTP connections are disconnected before InnerTube fallback.
  const newPipeController = new AbortController();
  let newPipeTimer: ReturnType<typeof setTimeout> | undefined;
  const newPipeAttempt = resolveNewPipeStream(videoId, track, newPipeController.signal);
  const boundedNewPipeAttempt = Promise.race([
    newPipeAttempt,
    new Promise<null>((resolve) => {
      newPipeTimer = setTimeout(() => {
        newPipeController.abort();
        resolve(null);
      }, 3000);
    })
  ]).then((stream) => stream ?? null).catch((error) => {
    errors.push(error instanceof Error ? `NewPipe: ${error.message}` : `NewPipe: ${String(error)}`);
    return null;
  }).finally(() => {
    if (newPipeTimer) clearTimeout(newPipeTimer);
  });

  const earlyNewPipe = await boundedNewPipeAttempt;
  if (earlyNewPipe) return earlyNewPipe;

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
      const dataSaverEnabled = usePreferencesStore.getState().dataSaverEnabled;
      audioStreams.sort((a, b) => {
        const aBitrate = Number(a.bitrate || 0);
        const bBitrate = Number(b.bitrate || 0);
        // In data saver mode, prefer a lower-bitrate audio format when the
        // provider exposes one at or below 128 kbps. Otherwise keep the
        // normal best-format selection rather than choosing an unknown stream.
        if (dataSaverEnabled) {
          const aWithinBudget = aBitrate > 0 && aBitrate <= 128_000;
          const bWithinBudget = bBitrate > 0 && bBitrate <= 128_000;
          if (aWithinBudget !== bWithinBudget) return aWithinBudget ? -1 : 1;
          if (aWithinBudget && bWithinBudget) return bBitrate - aBitrate;
        }
        const aIsMp4 = a.mimeType.includes("audio/mp4") ? 1 : 0;
        const bIsMp4 = b.mimeType.includes("audio/mp4") ? 1 : 0;
        if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
        return bBitrate - aBitrate;
      });
      const bestFormat = audioStreams[0];
      const hlsManifestUrl: string | undefined = typeof streamingData?.hlsManifestUrl === "string"
        ? streamingData.hlsManifestUrl
        : undefined;
      const dashManifestUrl: string | undefined = typeof streamingData?.dashManifestUrl === "string"
        ? streamingData.dashManifestUrl
        : undefined;
      const rawManifestUrl = hlsManifestUrl || dashManifestUrl;
      const manifestUrl = rawManifestUrl ? validateStreamUrl(rawManifestUrl, profile.name) : undefined;
      if (!bestFormat && !manifestUrl) throw new Error(`${profile.name}: no direct audio stream or supported manifest URL`);

      const expiresInSeconds = Number(streamingData?.expiresInSeconds || 21500);
      const durationFromPlayer = safeDuration(payload?.videoDetails?.lengthSeconds);
      const durationFromFormat = safeDuration(
        bestFormat?.approxDurationMs ? Number(bestFormat.approxDurationMs) / 1000 : 0
      );
      const fallbackDuration = safeDuration((track.durationMs || 0) / 1000);
      return {
        url: bestFormat ? validateStreamUrl(bestFormat.url, profile.name) : manifestUrl!,
        mimeType: bestFormat ? bestFormat.mimeType : hlsManifestUrl ? "application/x-mpegURL" : "application/dash+xml",
        durationSeconds: durationFromPlayer || durationFromFormat || fallbackDuration,
        bitrate: bestFormat ? safeBitrate(bestFormat.bitrate) ?? 128_000 : undefined,
        userAgent: profile.userAgent,
        expiresAt: boundedExpiry(Date.now() + (Number.isFinite(expiresInSeconds) ? expiresInSeconds : 21_500) * 1000)
      } satisfies ResolvedYouTubeAudio;
    } finally {
      clearTimeout(timeout);
    }
  });

  let resolvedStream: ResolvedYouTubeAudio | null = null;
  try {
    resolvedStream = await Promise.any(profileAttempts);
  } catch (error) {
    const failures = error instanceof AggregateError
      ? error.errors.map((item) => item instanceof Error ? item.message : String(item))
      : [error instanceof Error ? error.message : String(error)];
    errors.push(...failures);
  } finally {
    // Always stop any profile request still in flight. This also runs when all
    // profiles fail, preventing a late response from outliving the resolver.
    controllers.forEach((controller) => {
      if (!controller.signal.aborted) controller.abort();
    });
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
  if (!VIDEO_ID_PATTERN.test(videoId)) throw new Error("Invalid YouTube video ID for this track.");

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
      if (resolutionVersions.get(videoId) === version) {
        cacheStream(videoId, stream);
        resolutionVersions.delete(videoId);
      }
      return stream;
    })
    .finally(() => {
      if (inFlightResolutions.get(videoId) === request) inFlightResolutions.delete(videoId);
      if (resolutionVersions.get(videoId) === version) resolutionVersions.delete(videoId);
    });

  inFlightResolutions.set(videoId, request);
  return request;
}
