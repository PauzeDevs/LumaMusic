import type { MusicTrack } from "../types/music";

export type ResolvedPlaybackStream = {
  url: string;
  mimeType?: string;
  expiresAt?: string;
  headers?: Record<string, string>;
};

const RESOLVER_URL = process.env.EXPO_PUBLIC_YOUTUBE_PLAYBACK_RESOLVER_URL?.trim();

function isSecureStreamUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Calls a separately operated, authorized playback resolver.
 *
 * The resolver must only return streams that the operator is licensed and
 * contractually permitted to provide to this app. This client deliberately
 * does not implement YouTube signature deciphering, cookie extraction,
 * PoToken generation, or other undocumented access-control workarounds.
 */
export async function resolveYouTubeMusicPlayback(
  track: MusicTrack
): Promise<ResolvedPlaybackStream> {
  if (!track.youtubeVideoId) {
    throw new Error("This YouTube Music track has no video identifier.");
  }
  if (!RESOLVER_URL) {
    throw new Error(
      "In-app YouTube playback is not configured. The authorized playback resolver is not set."
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(RESOLVER_URL);
  } catch {
    throw new Error("The configured playback resolver URL is invalid.");
  }
  if (endpoint.protocol !== "https:") {
    throw new Error("The playback resolver must use HTTPS.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "youtube_music",
        videoId: track.youtubeVideoId,
        client: "lumamusic-android"
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The playback resolver timed out. Please try again.");
    }
    throw new Error(error instanceof Error ? error.message : "Could not reach the playback resolver.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "The playback resolver denied this request."
        : `Playback stream resolution failed (${response.status}).`
    );
  }

  let payload: Partial<ResolvedPlaybackStream>;
  try {
    payload = await response.json() as Partial<ResolvedPlaybackStream>;
  } catch {
    throw new Error("The playback resolver returned an invalid response.");
  }
  if (!payload || typeof payload !== "object" || !isSecureStreamUrl(payload.url)) {
    throw new Error("The playback resolver did not return a valid HTTPS audio stream.");
  }
  if (payload.mimeType !== undefined && (typeof payload.mimeType !== "string" || !payload.mimeType.startsWith("audio/"))) {
    throw new Error("The playback resolver returned an unsupported media type.");
  }
  if (payload.expiresAt) {
    const expiry = Date.parse(payload.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) {
      throw new Error("The playback resolver returned an expired stream.");
    }
  }

  return {
    url: payload.url,
    ...(typeof payload.mimeType === "string" ? { mimeType: payload.mimeType } : {}),
    ...(typeof payload.expiresAt === "string" ? { expiresAt: payload.expiresAt } : {}),
    ...(payload.headers && typeof payload.headers === "object" && !Array.isArray(payload.headers)
      ? { headers: Object.fromEntries(Object.entries(payload.headers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) }
      : {})
  };
}
