import type { MusicTrack } from "../types/music";

const API_BASE = "https://api.audius.co/v1";
const APP_NAME = "LumaMusic";

type RawAudiusTrack = {
  id?: string;
  title?: string;
  duration?: number;
  is_streamable?: boolean | string;
  isStreamable?: boolean | string;
  is_stream_gated?: boolean;
  isStreamGated?: boolean;
  permalink?: string;
  genre?: string;
  play_count?: number;
  playCount?: number;
  artwork?: { _150x150?: string; _480x480?: string; _1000x1000?: string } | string | null;
  cover_art?: string | null;
  user?: { name?: string; handle?: string } | null;
};

type AudiusResponse<T> = { data?: T; error?: string; message?: string };

function mapTrack(raw: RawAudiusTrack): MusicTrack | null {
  if (!raw.id || !raw.title) return null;

  const artworkObject = typeof raw.artwork === "object" && raw.artwork !== null ? raw.artwork : null;
  const artwork =
    artworkObject?._480x480 ??
    artworkObject?._1000x1000 ??
    (typeof raw.artwork === "string" ? raw.artwork : null) ??
    raw.cover_art ??
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=85";

  const streamFlag = raw.is_streamable ?? raw.isStreamable;
  const isStreamable = streamFlag === true || streamFlag === "true";
  const isStreamGated = raw.is_stream_gated === true || raw.isStreamGated === true;

  return {
    id: "audius:" + raw.id,
    source: "audius",
    sourceTrackId: raw.id,
    title: raw.title,
    artist: raw.user?.name ?? raw.user?.handle ?? "Unknown artist",
    artwork,
    durationMs: Math.max(0, Math.round((raw.duration ?? 0) * 1000)),
    isStreamable: isStreamable && !isStreamGated,
    permalink: raw.permalink,
    genre: raw.genre,
    playCount: raw.play_count ?? raw.playCount
  };
}

async function request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  url.searchParams.set("app_name", APP_NAME);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("Audius request failed (" + response.status + "). Please try again.");
  }

  const payload = (await response.json()) as AudiusResponse<T>;
  if (payload.error) throw new Error(payload.message ?? payload.error);
  if (payload.data === undefined) throw new Error("Audius returned an unexpected response.");
  return payload.data;
}

export async function getTrendingTracks(limit = 20, offset = 0): Promise<MusicTrack[]> {
  const rawTracks = await request<RawAudiusTrack[]>("/tracks/trending", {
    time: "week",
    limit,
    offset
  });
  return rawTracks.map(mapTrack).filter((track): track is MusicTrack => track !== null);
}

export async function searchAudiusTracks(query: string, limit = 25, offset = 0): Promise<MusicTrack[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const rawTracks = await request<RawAudiusTrack[]>("/tracks/search", {
    query: normalized,
    sort_method: "relevant",
    limit,
    offset
  });
  return rawTracks.map(mapTrack).filter((track): track is MusicTrack => track !== null);
}

export function getAudiusStreamUrl(trackId: string): string {
  return API_BASE + "/tracks/" + encodeURIComponent(trackId) + "/stream?app_name=" + APP_NAME;
}
