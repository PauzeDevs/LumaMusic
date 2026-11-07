import type { MusicTrack } from "../types/music";

const API_BASE = "https://api.audius.co/v1";
const APP_NAME = "LumaMusic";

type RawAudiusTrack = {
  id?: string;
  title?: string;
  artist_name?: string;
  artistName?: string;
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
    artwork: picture ?? "",
    followerCount: raw.follower_count ?? 0,
    trackCount: raw.track_count ?? 0
  };
}

function mapPlaylist(raw: RawAudiusPlaylist) {
  if (!raw.id) return null;
  const artworkObject = typeof raw.artwork === "object" && raw.artwork !== null ? raw.artwork : null;
  const artwork = artworkObject?._480x480 ?? artworkObject?._1000x1000 ??
    (typeof raw.artwork === "string" ? raw.artwork : null) ??
    "";
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
    "";

  const streamFlag = raw.is_streamable ?? raw.isStreamable;
  const isStreamable = streamFlag === true || streamFlag === "true";
  const gatedFlag = raw.is_stream_gated ?? raw.isStreamGated;
  const isStreamGated = gatedFlag === true || gatedFlag === "true";

  const creditedArtist = raw.artist_name?.trim() || raw.artistName?.trim() ||
    raw.artists?.map((artist) => artist.name ?? artist.artist_name ?? artist.handle).find((name) => Boolean(name?.trim())) ||
    undefined;
  const uploader = raw.user?.name?.trim() || raw.user?.handle?.trim() || undefined;
  const durationSeconds = typeof raw.duration === "number" && Number.isFinite(raw.duration)
    ? Math.max(0, raw.duration)
    : 0;

  return {
    id: "audius:" + raw.id,
    source: "audius",
    sourceTrackId: raw.id,
    title: raw.title,
    artist: creditedArtist ?? "Artist credit unavailable",
    uploader,
    artistCredited: Boolean(creditedArtist),
    artwork,
    durationMs: Math.round(durationSeconds * 1000),
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Audius request failed (" + response.status + "). Please try again.");
    }

    const payload = (await response.json()) as AudiusResponse<T>;
    if (payload.error) throw new Error(payload.message ?? payload.error);
    if (payload.data === undefined) throw new Error("Audius returned an unexpected response.");
    return payload.data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Audius request timed out. Check your connection and try again.");
    throw new Error(error instanceof Error ? error.message : "Could not connect to Audius.");
  } finally {
    clearTimeout(timeout);
  }
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
