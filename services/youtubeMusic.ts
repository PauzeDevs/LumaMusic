import { Linking } from "react-native";
import type { MusicArtist, MusicPlaylist, MusicTrack } from "../types/music";

const SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false";
const CONTEXT = { client: { clientName: "WEB_REMIX", clientVersion: "1.20250521.01.00", hl: "en", gl: "US" } };
type Obj = Record<string, any>;

function readText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value.runs)) return value.runs.map((run: Obj) => run.text ?? "").join("");
  return value.simpleText ?? "";
}
function imageUrl(value: any): string {
  const items = value?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? value?.thumbnail?.thumbnails ?? value?.thumbnails ?? [];
  return items.length ? items[items.length - 1].url : "";
}
function collect(root: any, name: string, found: Obj[] = []): Obj[] {
  if (!root || typeof root !== "object") return found;
  if (Array.isArray(root)) { root.forEach((item) => collect(item, name, found)); return found; }
  if (root[name]) found.push(root[name]);
  Object.values(root).forEach((value) => { if (value && typeof value === "object") collect(value, name, found); });
  return found;
}
async function searchRequest(query: string, params?: string): Promise<Obj> {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Origin: "https://music.youtube.com", Referer: "https://music.youtube.com/" },
    body: JSON.stringify({ context: CONTEXT, query, ...(params ? { params } : {}) })
  });
  if (!response.ok) throw new Error("YouTube Music search failed (" + response.status + ").");
  return response.json() as Promise<Obj>;
}
function mapTrack(item: Obj): MusicTrack | null {
  const columns = item.flexColumns ?? [];
  const titleData = columns[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
  const title = readText(titleData);
  const videoId = item.playlistItemData?.videoId
    ?? titleData?.runs?.find((run: Obj) => run.navigationEndpoint)?.navigationEndpoint?.watchEndpoint?.videoId
    ?? item.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId || !title) return null;
  const artist = readText(columns[1]?.musicResponsiveListItemFlexColumnRenderer?.text).split(" • ")[0] || "Unknown artist";
  const durationText = readText(item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text);
  const durationSeconds = durationText.split(":").map(Number).reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
  return {
    id: "youtube:" + videoId, source: "youtube_music", sourceTrackId: videoId, youtubeVideoId: videoId,
    youtubeUrl: "https://music.youtube.com/watch?v=" + encodeURIComponent(videoId),
    title, artist, artwork: imageUrl(item.thumbnail), durationMs: durationSeconds * 1000, isStreamable: false
  };
}
function mapPlaylist(item: Obj): MusicPlaylist | null {
  const endpoint = item.navigationEndpoint?.browseEndpoint ?? item.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const id = endpoint?.browseId ?? item.navigationEndpoint?.watchPlaylistEndpoint?.playlistId;
  const title = readText(item.title);
  if (!id || !title) return null;
  return { id: "youtube-playlist:" + id, source: "youtube_music", sourcePlaylistId: id, title,
    subtitle: readText(item.subtitle) || "YouTube Music playlist", artwork: imageUrl(item.thumbnailRenderer ?? item.thumbnail),
    trackIds: [], trackCount: 0, permalink: "https://music.youtube.com/playlist?list=" + encodeURIComponent(id) };
}
function mapArtist(item: Obj): MusicArtist | null {
  const endpoint = item.navigationEndpoint?.browseEndpoint ?? item.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const id = endpoint?.browseId;
  const name = readText(item.title);
  if (!id || !name) return null;
  return { id: "youtube-artist:" + id, sourceArtistId: id, name, handle: "", bio: readText(item.subtitle),
    artwork: imageUrl(item.thumbnailRenderer ?? item.thumbnail), followerCount: 0, trackCount: 0 };
}
export async function searchYouTubeMusicTracks(query: string, limit = 25): Promise<MusicTrack[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized);
  return collect(payload, "musicResponsiveListItemRenderer").map(mapTrack)
    .filter((item): item is MusicTrack => Boolean(item))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, limit);
}
export async function getDiscoveryTracks(limit = 20): Promise<MusicTrack[]> {
  return searchYouTubeMusicTracks("new music", limit);
}
export async function searchYouTubeMusicPlaylists(query: string, limit = 12): Promise<MusicPlaylist[]> {
  if (!query.trim()) return [];
  const payload = await searchRequest(query, "EgWKAQIoAWoKEAkQBRAKEAMQBA%3D%3D");
  return collect(payload, "musicTwoRowItemRenderer").map(mapPlaylist).filter((item): item is MusicPlaylist => Boolean(item)).slice(0, limit);
}
export async function getFeaturedPlaylists(limit = 8): Promise<MusicPlaylist[]> {
  return searchYouTubeMusicPlaylists("popular music playlists", limit);
}
export async function searchYouTubeMusicArtists(query: string, limit = 20): Promise<MusicArtist[]> {
  if (!query.trim()) return [];
  const payload = await searchRequest(query, "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D");
  return collect(payload, "musicTwoRowItemRenderer").map(mapArtist).filter((item): item is MusicArtist => Boolean(item)).slice(0, limit);
}
export async function openTrackInYouTubeMusic(track: MusicTrack): Promise<void> {
  if (!track.youtubeUrl) throw new Error("This track does not have a YouTube Music URL.");
  await Linking.openURL(track.youtubeUrl);
}
