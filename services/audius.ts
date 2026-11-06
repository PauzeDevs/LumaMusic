import type { MusicTrack } from "../types/music";

const API_BASE = "https://api.audius.co/v1";
const APP_NAME = "LumaMusic";

type RawAudiusTrack = {
  id?: string;
  title?: string;
  duration?: number;
  is_streamable?: boolean | string;
  isStreamable?: boolean | string;
  is_stream_gated?: boolean | string;
  isStreamGated?: boolean | string;
  permalink?: string;
  genre?: string;
  play_count?: number;
  playCount?: number;
  artwork?: { _150x150?: string; _480x480?: string; _1000x1000?: string } | string | null;
  cover_art?: string | null;
  user?: { name?: string; handle?: string } | null;
  artists?: Array<{ name?: string; artist_name?: string; handle?: string }>;
};

type RawAudiusUser = {
  id?: string;
  name?: string;
  handle?: string;
  bio?: string;
  profile_picture?: { _480x480?: string; _150x150?: string } | string | null;
  follower_count?: number;
  track_count?: number;
};

type RawAudiusPlaylist = {
  id?: string;
  playlist_name?: string;
  description?: string;
  artwork?: { _480x480?: string; _1000x1000?: string } | string | null;
  user?: { name?: string; handle?: string } | null;
  track_count?: number;
  permalink?: string;
};

type AudiusResponse<T> = { data?: T; error?: string; message?: string };

function mapArtist(raw: RawAudiusUser) {
  if (!raw.id) return null;
  const picture = typeof raw.profile_picture === "object" && raw.profile_picture !== null
    ? raw.profile_picture._480x480 ?? raw.profile_picture._150x150
    : raw.profile_picture;
  return {
    id: "audius:" + raw.id,
    sourceArtistId: raw.id,
    name: raw.name ?? raw.handle ?? "Unknown artist",
    handle: raw.handle ?? "",
    bio: raw.bio ?? "",
    artwork: picture ?? "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=85",
    followerCount: raw.follower_count ?? 0,
    trackCount: raw.track_count ?? 0
  };
}

function mapPlaylist(raw: RawAudiusPlaylist) {
  if (!raw.id) return null;
  const artworkObject = typeof raw.artwork === "object" && raw.artwork !== null ? raw.artwork : null;
  const artwork = artworkObject?._480x480 ?? artworkObject?._1000x1000 ??
    (typeof raw.artwork === "string" ? raw.artwork : null) ??
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=85";
  return {
    id: "audius:" + raw.id,
    source: "audius" as const,
    sourcePlaylistId: raw.id,
    title: raw.playlist_name ?? "Untitled playlist",
    subtitle: raw.user?.name ?? raw.user?.handle ?? "Audius playlist",
    artwork,
    trackIds: [],
    trackCount: raw.track_count ?? 0,
    permalink: raw.permalink
  };
}

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
  const gatedFlag = raw.is_stream_gated ?? raw.isStreamGated;
  const isStreamGated = gatedFlag === true || gatedFlag === "true";

  return {
    id: "audius:" + raw.id,
    source: "audius",
    sourceTrackId: raw.id,
    title: raw.title,
    artist: raw.user?.name ?? raw.user?.handle ?? raw.artists?.[0]?.name ?? raw.artists?.[0]?.artist_name ?? raw.artists?.[0]?.handle ?? "Unknown artist",
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

export async function searchAudiusArtists(query: string, limit = 20, offset = 0) {
  const normalized = query.trim();
  if (!normalized) return [];
  const rawUsers = await request<RawAudiusUser[]>("/users/search", {
    query: normalized,
    sort_method: "relevant",
    limit,
    offset
  });
  return rawUsers.map(mapArtist).filter((artist): artist is NonNullable<typeof artist> => artist !== null);
}

export async function searchAudiusPlaylists(query: string, limit = 20, offset = 0) {
  const normalized = query.trim();
  if (!normalized) return [];
  const rawPlaylists = await request<RawAudiusPlaylist[]>("/playlists/search", {
    query: normalized,
    sort_method: "relevant",
    limit,
    offset
  });
  return rawPlaylists.map(mapPlaylist).filter((playlist): playlist is NonNullable<typeof playlist> => playlist !== null);
}

export async function getAudiusArtist(artistId: string) {
  const raw = await request<RawAudiusUser>("/users/" + encodeURIComponent(artistId));
  return mapArtist(raw);
}

export async function getAudiusArtistTracks(artistId: string, limit = 30, offset = 0) {
  const rawTracks = await request<RawAudiusTrack[]>("/users/" + encodeURIComponent(artistId) + "/tracks", {
    limit,
    offset
  });
  return rawTracks.map(mapTrack).filter((track): track is MusicTrack => track !== null);
}

export async function getAudiusPlaylist(playlistId: string) {
  const raw = await request<RawAudiusPlaylist>("/playlists/" + encodeURIComponent(playlistId));
  return mapPlaylist(raw);
}

export async function getAudiusPlaylistTracks(playlistId: string, limit = 50, offset = 0) {
  const rawTracks = await request<RawAudiusTrack[]>("/playlists/" + encodeURIComponent(playlistId) + "/tracks", {
    limit,
    offset
  });
  return rawTracks.map(mapTrack).filter((track): track is MusicTrack => track !== null);
}

export async function getTrendingPlaylists(limit = 10, offset = 0) {
  const rawPlaylists = await request<RawAudiusPlaylist[]>("/playlists/trending", {
    time: "week",
    limit,
    offset
  });
  return rawPlaylists.map(mapPlaylist).filter((playlist): playlist is NonNullable<typeof playlist> => playlist !== null);
}
