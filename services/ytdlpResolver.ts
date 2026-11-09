import type { MusicTrack } from "../types/music";

export type YtDlpResolvedFormat = {
  url: string;
  mimeType: string;
  bitrate: number;
  filesize?: number;
};

export type YtDlpResolution = {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  thumbnail?: string | null;
  formats: YtDlpResolvedFormat[];
};

/**
 * Client for a privately deployed LumaMusic yt-dlp resolver.
 * Do not put a privileged resolver token in the mobile app.
 * The endpoint must be protected by your own user-authenticated backend.
 */
export async function resolveAuthorisedAudio(
  sourceUrl: string,
  endpoint: string,
  accessToken: string
): Promise<YtDlpResolution> {
  const response = await fetch(endpoint.replace(/\/$/, "") + "/resolve", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken
    },
    body: JSON.stringify({ url: sourceUrl })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(payload.detail || "The authorised audio source could not be resolved.");
  }

  return response.json() as Promise<YtDlpResolution>;
}

export function toResolvedTrack(track: MusicTrack, resolution: YtDlpResolution, formatIndex = 0) {
  const format = resolution.formats[formatIndex];
  if (!format) throw new Error("No permitted audio format is available.");
  return {
    ...track,
    title: resolution.title || track.title,
    artist: resolution.artist || track.artist,
    artwork: resolution.thumbnail || track.artwork,
    durationMs: Math.max(0, resolution.durationSeconds * 1000),
    resolvedAudioUrl: format.url,
    resolvedAudioMimeType: format.mimeType,
    resolvedAudioBitrate: format.bitrate
  };
}
