import type { MusicTrack } from "../types/music";
import { resolveWithYtdlpService } from "./ytdlpResolver";

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

/**
 * InnerTube client profiles that return direct, unthrottled adaptive audio URLs
 * without requiring a browser JS signature decipherer or external yt-dlp server.
 */
const INNERTUBE_PLAYER_CLIENTS = [
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
 * Falls back to the optional ytdlpResolver service only if all InnerTube clients fail.
 */
export async function resolveYouTubeMusicAudio(track: MusicTrack): Promise<ResolvedYouTubeAudio> {
  const videoId = extractYouTubeVideoId(track);
  if (!videoId) {
    throw new Error("Missing YouTube video ID for this track.");
  }

  // Check if we already have a non-expired stream URL cached (with 5-min safety buffer)
  const cached = streamCache.get(videoId);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached;
  }

  const errors: string[] = [];

  for (const profile of INNERTUBE_PLAYER_CLIENTS) {
    try {
      const response = await fetch(PLAYER_URL, {
        method: "POST",
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

      if (!response.ok) {
        errors.push(`${profile.name}: HTTP ${response.status}`);
        continue;
      }

      const payload: Record<string, any> = await response.json();
      const status = payload?.playabilityStatus?.status;

      if (status !== "OK") {
        const reason = payload?.playabilityStatus?.reason || status || "Unavailable";
        errors.push(`${profile.name}: ${reason}`);
        continue;
      }

      const streamingData = payload?.streamingData;
      const adaptiveFormats: Record<string, any>[] = Array.isArray(streamingData?.adaptiveFormats)
        ? streamingData.adaptiveFormats
        : [];
      const formats: Record<string, any>[] = Array.isArray(streamingData?.formats)
        ? streamingData.formats
        : [];

      // Collect direct audio-only streams first
      const audioStreams = [...adaptiveFormats, ...formats].filter(
        (fmt) =>
          typeof fmt?.url === "string" &&
          fmt.url.length > 0 &&
          typeof fmt?.mimeType === "string" &&
          fmt.mimeType.startsWith("audio/")
      );

      // Prioritize audio/mp4 (M4A/AAC, itag 140) first because it plays natively on both iOS AVPlayer and Android ExoPlayer,
      // then sort by highest bitrate.
      audioStreams.sort((a, b) => {
        const aIsMp4 = a.mimeType.includes("audio/mp4") ? 1 : 0;
        const bIsMp4 = b.mimeType.includes("audio/mp4") ? 1 : 0;
        if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4;
        return Number(b.bitrate || 0) - Number(a.bitrate || 0);
      });

      const bestFormat = audioStreams[0];
      const hlsManifestUrl: string | undefined = streamingData?.hlsManifestUrl;

      if (!bestFormat && !hlsManifestUrl) {
        errors.push(`${profile.name}: No direct audio stream URL in response`);
        continue;
      }

      const expiresInSeconds = Number(streamingData?.expiresInSeconds || 21500);
      const durationFromPlayer = Number(payload?.videoDetails?.lengthSeconds || 0);
      const durationFromFormat = bestFormat?.approxDurationMs
        ? Math.round(Number(bestFormat.approxDurationMs) / 1000)
        : 0;
      const fallbackDuration = Math.max(0, Math.round((track.durationMs || 0) / 1000));

      const resolved: ResolvedYouTubeAudio = {
        url: bestFormat ? bestFormat.url : hlsManifestUrl!,
        mimeType: bestFormat ? bestFormat.mimeType : "application/x-mpegURL",
        durationSeconds: durationFromPlayer || durationFromFormat || fallbackDuration,
        bitrate: bestFormat ? Number(bestFormat.bitrate || 128000) : undefined,
        userAgent: profile.userAgent,
        expiresAt: Date.now() + expiresInSeconds * 1000
      };

      streamCache.set(videoId, resolved);
      return resolved;
    } catch (error) {
      errors.push(
        `${profile.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Fallback to optional external yt-dlp resolver if configured in the environment
  try {
    const fallback = await resolveWithYtdlpService(track);
    if (fallback?.url) {
      return {
        url: fallback.url,
        mimeType: "audio/mp4",
        durationSeconds:
          fallback.durationSeconds || Math.max(0, Math.round((track.durationMs || 0) / 1000)),
        userAgent: INNERTUBE_PLAYER_CLIENTS[0].userAgent,
        expiresAt: Date.now() + 3600 * 1000
      };
    }
  } catch {
    // Ignore fallback error and surface InnerTube error details
  }

  throw new Error(
    `Could not stream "${track.title}". (${errors.join(" | ") || "No playable stream"})`
  );
}