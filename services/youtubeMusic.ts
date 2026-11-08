import { Linking } from "react-native";
import type { MusicArtist, MusicPlaylist, MusicTrack } from "../types/music";

const SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false";
const CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20250521.01.00",
    hl: "en",
    gl: "US"
  }
};

type Obj = Record<string, any>;

function readText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value.runs)) return value.runs.map((run: Obj) => run.text ?? "").join("");
  return value.simpleText ?? "";
}

function titleFor(item: Obj): string {
  const column = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
  return readText(item.title ?? column);
}

function browseIdFor(item: Obj): string {
  const endpoints = [
    item.navigationEndpoint?.browseEndpoint,
    item.title?.runs?.find((run: Obj) => run.navigationEndpoint?.browseEndpoint)?.navigationEndpoint?.browseEndpoint,
    item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.find((run: Obj) => run.navigationEndpoint?.browseEndpoint)?.navigationEndpoint?.browseEndpoint
  ];
  return endpoints.find((endpoint) => endpoint?.browseId)?.browseId ?? "";
}

function thumbnailUrl(value: any): string {
  const candidates = [
    value?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    value?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    value?.thumbnail?.thumbnails,
    value?.thumbnails
  ];
  const thumbnails = candidates.find((items) => Array.isArray(items) && items.length > 0) ?? [];
  return thumbnails[thumbnails.length - 1]?.url ?? "";
}

function imageFor(item: Obj): string {
  return thumbnailUrl(item.thumbnailRenderer ?? item.thumbnail ?? item);
}

function collectRenderers(root: any, rendererName: string, output: Obj[] = []): Obj[] {
  if (!root || typeof root !== "object") return output;
  if (Array.isArray(root)) {
    root.forEach((item) => collectRenderers(item, rendererName, output));
    return output;
  }
  if (root[rendererName] && typeof root[rendererName] === "object") output.push(root[rendererName]);
  Object.values(root).forEach((value) => {
    if (value && typeof value === "object") collectRenderers(value, rendererName, output);
  });
  return output;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.id === item.id) === index);
}

async function searchRequest(query: string, params?: string): Promise<Obj> {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/"
    },
    body: JSON.stringify({ context: CONTEXT, query, ...(params ? { params } : {}) })
  });

  if (!response.ok) {
    throw new Error("YouTube Music search failed (" + response.status + "). Please try again.");
  }
  return response.json() as Promise<Obj>;
}

function parseDuration(value: string): number {
  const match = value.match(/(?:^|\D)(\d{1,2}:\d{2}(?::\d{2})?)(?:\D|$)/);
  if (!match) return 0;
  return match[1].split(":").map(Number).reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
}

function artistFor(item: Obj): string {
  const byline = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
  const runs: Obj[] = byline?.runs ?? [];
  const linkedArtist = runs.find((run) => {
    const id = run.navigationEndpoint?.browseEndpoint?.browseId ?? "";
    return id.startsWith("UC") && readText(run).trim().length > 0;
  });
  if (linkedArtist) return readText(linkedArtist).trim();

  const segments = readText(byline).split(" • ").map((part) => part.trim()).filter(Boolean);
  const ignored = new Set(["song", "video", "album", "single", "ep", "playlist", "music video"]);
  const candidate = segments.find((part) => !ignored.has(part.toLowerCase()) && !/^\d+:\d{2}$/.test(part));
  return candidate ?? "Artist unavailable";
}

function mapTrack(item: Obj): MusicTrack | null {
  const titleData = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
  const title = titleFor(item).trim();
  const videoId = item.playlistItemData?.videoId
    ?? item.navigationEndpoint?.watchEndpoint?.videoId
    ?? titleData?.runs?.find((run: Obj) => run.navigationEndpoint?.watchEndpoint?.videoId)?.navigationEndpoint?.watchEndpoint?.videoId;

  if (!videoId || !title) return null;

  const durationText = readText(item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text);
  const durationSeconds = parseDuration(durationText || readText(item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text));

  return {
    id: "youtube:" + videoId,
    source: "youtube_music",
    sourceTrackId: videoId,
    youtubeVideoId: videoId,
    youtubeUrl: "https://music.youtube.com/watch?v=" + encodeURIComponent(videoId),
    title,
    artist: artistFor(item),
    artwork: imageFor(item),
    durationMs: durationSeconds * 1000,
    isStreamable: false
  };
}

function mapPlaylist(item: Obj): MusicPlaylist | null {
  const browseId = browseIdFor(item);
  const endpointId = item.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ?? "";
  const rawId = endpointId || browseId;
  const playlistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;
  const title = titleFor(item).trim();

  if (!playlistId.startsWith("PL") || !title) return null;

  return {
    id: "youtube-playlist:" + playlistId,
    source: "youtube_music",
    sourcePlaylistId: playlistId,
    title,
    subtitle: readText(item.subtitle ?? item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text) || "YouTube Music playlist",
    artwork: imageFor(item),
    trackIds: [],
    trackCount: 0,
    permalink: "https://music.youtube.com/playlist?list=" + encodeURIComponent(playlistId)
  };
}

function mapArtist(item: Obj): MusicArtist | null {
  const browseId = browseIdFor(item);
  const name = titleFor(item).trim();
  if (!browseId.startsWith("UC") || !name) return null;

  return {
    id: "youtube-artist:" + browseId,
    sourceArtistId: browseId,
    name,
    handle: "",
    bio: readText(item.subtitle ?? item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text),
    artwork: imageFor(item),
    followerCount: 0,
    trackCount: 0
  };
}

function searchItems(payload: Obj): Obj[] {
  return [
    ...collectRenderers(payload, "musicResponsiveListItemRenderer"),
    ...collectRenderers(payload, "musicTwoRowItemRenderer")
  ];
}

export async function searchYouTubeMusicTracks(query: string, limit = 25): Promise<MusicTrack[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized);
  const tracks = collectRenderers(payload, "musicResponsiveListItemRenderer")
    .map(mapTrack)
    .filter((item): item is MusicTrack => Boolean(item));
  return uniqueById(tracks).slice(0, limit);
}

export async function getDiscoveryTracks(limit = 20): Promise<MusicTrack[]> {
  return searchYouTubeMusicTracks("new music", limit);
}

export async function searchYouTubeMusicPlaylists(query: string, limit = 12): Promise<MusicPlaylist[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized, "EgWKAQIoAWoKEAkQBRAKEAMQBA%3D%3D");
  return uniqueById(searchItems(payload).map(mapPlaylist).filter((item): item is MusicPlaylist => Boolean(item))).slice(0, limit);
}

export async function getFeaturedPlaylists(limit = 8): Promise<MusicPlaylist[]> {
  return searchYouTubeMusicPlaylists("popular music playlists", limit);
}

export async function searchYouTubeMusicArtists(query: string, limit = 20): Promise<MusicArtist[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized, "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D");
  return uniqueById(searchItems(payload).map(mapArtist).filter((item): item is MusicArtist => Boolean(item))).slice(0, limit);
}

export async function openTrackInYouTubeMusic(track: MusicTrack): Promise<void> {
  if (!track.youtubeUrl) throw new Error("This track does not have a YouTube Music URL.");
  await Linking.openURL(track.youtubeUrl);
}
