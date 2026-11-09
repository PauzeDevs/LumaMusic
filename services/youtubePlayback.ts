import type { MusicTrack } from "../types/music";

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const PLAYER_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    androidSdkVersion: 35,
    hl: "en",
    gl: "US"
  }
};

type PlayerFormat = {
  url?: string;
  mimeType?: string;
  bitrate?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  contentLength?: string;
};

type PlayerResponse = {
  playabilityStatus?: { status?: string; reason?: string; messages?: string[] };
  streamingData?: { adaptiveFormats?: PlayerFormat[]; formats?: PlayerFormat[] };
  videoDetails?: { title?: string; author?: string; lengthSeconds?: string };
};

export type ResolvedYouTubeAudio = {
  url: string;
  mimeType: string;
  bitrate: number;
  durationSeconds: number;
};

/**
 * Resolves a currently exposed direct audio format from YouTube's player
 * response. This is an independent, best-effort client implementation.
 * It deliberately does not implement signature/cipher bypasses or DRM removal.
 */
export async function resolveYouTubeMusicAudio(track: MusicTrack): Promise<ResolvedYouTubeAudio> {
  const videoId = track.youtubeVideoId ?? track.sourceTrackId;
  if (!videoId) throw new Error("This YouTube Music result is missing its video ID.");

  const response = await fetch(PLAYER_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://www.youtube.com",
      Referer: "https://www.youtube.com/"
    },
    body: JSON.stringify({
      context: PLAYER_CONTEXT,
      videoId,
      contentCheckOk: true,
      racyCheckOk: true
    })
  });

  if (!response.ok) {
    throw new Error("YouTube could not prepare this track (HTTP " + response.status + ").");
  }

  const payload = await response.json() as PlayerResponse;
  const status = payload.playabilityStatus?.status;
  if (status && status !== "OK") {
    const reason = payload.playabilityStatus?.reason
      ?? payload.playabilityStatus?.messages?.[0]
      ?? "This track is unavailable to the current playback client.";
    throw new Error(reason);
  }

  const formats = [
    ...(payload.streamingData?.adaptiveFormats ?? []),
    ...(payload.streamingData?.formats ?? [])
  ].filter((format) => typeof format.url === "string" && format.url.length > 0)
    .filter((format) => format.mimeType?.startsWith("audio/"));

  if (formats.length === 0) {
    throw new Error("YouTube did not expose a direct audio stream for this track. This format needs a supported playback route and cannot be played by the current resolver.");
  }

  formats.sort((a, b) => {
    const aPreferred = a.mimeType?.includes("audio/mp4") ? 1 : 0;
    const bPreferred = b.mimeType?.includes("audio/mp4") ? 1 : 0;
    if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    return (b.bitrate ?? 0) - (a.bitrate ?? 0);
  });

  const selected = formats[0];
  const duration = Number(payload.videoDetails?.lengthSeconds);
  return {
    url: selected.url!,
    mimeType: selected.mimeType ?? "audio/*",
    bitrate: selected.bitrate ?? 0,
    durationSeconds: Number.isFinite(duration) && duration > 0
      ? duration
      : Math.max(0, track.durationMs / 1000)
  };
}
