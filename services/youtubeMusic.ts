import { Linking } from "react-native";
import type { MusicArtist, MusicPlaylist, MusicTrack } from "../types/music";

const SEARCH_URL = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false";
const BROWSE_URL = "https://music.youtube.com/youtubei/v1/browse?prettyPrint=false";
const NEXT_URL = "https://music.youtube.com/youtubei/v1/next?prettyPrint=false";

const CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20250521.01.00",
    hl: "en",
    gl: "US"
  }
};

// InnerTube search filter params
const FILTER_SONGS = "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D";
const FILTER_PLAYLISTS = "EgWKAQIoAWoKEAkQBRAKEAMQBA%3D%3D";
const FILTER_ARTISTS = "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D";
const FILTER_ALBUMS = "EgWKAQIYAWoKEAkQBRAKEAMQBA%3D%3D";

type Obj = Record<string, any>;

function readText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.text === "string") return value.text;
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

function upgradeThumbnail(rawUrl: string, videoId?: string): string {
  if (!rawUrl) {
    return videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : "";
  }

  // YouTube Music frequently returns several thumbnail sizes for the same
  // artwork. Select the largest source first, then request a large square
  // rendition from Google's image CDN instead of stretching a tiny preview.
  return rawUrl
    .replace(/=w\d+-h\d+/g, "=w1000-h1000")
    .replace(/=s\d+/g, "=s1000")
    .replace(/=w\d+/g, "=w1000")
    .replace(/-rw/g, "-rw");
}

function thumbnailUrl(value: any): string {
  const candidates = [
    value?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    value?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    value?.thumbnail?.thumbnails,
    value?.thumbnails
  ];
  const thumbnails = candidates.find((items) => Array.isArray(items) && items.length > 0) ?? [];
  const largest = thumbnails.reduce((best: Obj | null, current: Obj) => {
    if (!current?.url) return best;
    const score = (Number(current.width) || 0) * (Number(current.height) || 0);
    const bestScore = best ? (Number(best.width) || 0) * (Number(best.height) || 0) : -1;
    return score >= bestScore ? current : best;
  }, null);
  return largest?.url ?? "";
}

function imageFor(item: Obj, videoId?: string): string {
  const raw = thumbnailUrl(item.thumbnailRenderer ?? item.thumbnail ?? item);
  return upgradeThumbnail(raw, videoId);
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

function continuationTokens(root: any, output: string[] = []): string[] {
  if (!root || typeof root !== "object") return output;
  if (Array.isArray(root)) { root.forEach((item) => continuationTokens(item, output)); return output; }
  const token = root.continuation ?? root.nextContinuationData?.continuation ?? root.continuationEndpoint?.continuationCommand?.token;
  if (typeof token === "string" && token.length > 0) output.push(token);
  Object.values(root).forEach((value) => { if (value && typeof value === "object") continuationTokens(value, output); });
  return output;
}

async function browseTracksWithContinuation(initialPayload: Obj, limit: number): Promise<MusicTrack[]> {
  const collected: MusicTrack[] = [];
  const seenTokens = new Set<string>();
  let payload = initialPayload;
  for (let page = 0; page < 12; page += 1) {
    const rows = collectRenderers(payload, "musicResponsiveListItemRenderer");
    collected.push(...rows.map(mapTrack).filter((item): item is MusicTrack => Boolean(item)));
    const token = continuationTokens(payload).find((candidate) => !seenTokens.has(candidate));
    if (!token || collected.length >= limit) break;
    seenTokens.add(token);
    payload = await innerTubePost(BROWSE_URL, { continuation: token });
  }
  return uniqueById(collected).slice(0, limit);
}
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function innerTubePost(url: string, body: Obj): Promise<Obj> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({ context: CONTEXT, ...body })
  });

  if (!response.ok) {
    throw new Error("YouTube Music InnerTube request failed (" + response.status + "). Please try again.");
  }
  return response.json() as Promise<Obj>;
}

async function searchRequest(query: string, params?: string): Promise<Obj> {
  return innerTubePost(SEARCH_URL, { query, ...(params ? { params } : {}) });
}

function parseDuration(value: string): number {
  const match = value.match(/(?:^|\D)(\d{1,2}:\d{2}(?::\d{2})?)(?:\D|$)/);
  if (!match) return 0;
  return match[1].split(":").map(Number).reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
}

function artistFor(item: Obj): string {
  const byline = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text ?? item.shortBylineText;
  const runs: Obj[] = byline?.runs ?? [];
  const linkedArtists = runs
    .filter((run) => {
      const id = run.navigationEndpoint?.browseEndpoint?.browseId ?? "";
      return id.startsWith("UC") && readText(run).trim().length > 0;
    })
    .map((run) => readText(run).trim());

  if (linkedArtists.length > 0) return linkedArtists.join(", ");

  const segments = readText(byline).split(" • ").map((part) => part.trim()).filter(Boolean);
  const ignored = new Set(["song", "video", "album", "single", "ep", "playlist", "music video"]);
  const candidate = segments.find((part) => !ignored.has(part.toLowerCase()) && !/^\d+:\d{2}$/.test(part));
  return candidate ?? "Unknown Artist";
}

function mapTrack(item: Obj): MusicTrack | null {
  const titleData = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
  const title = titleFor(item).trim();
  const videoId =
    item.playlistItemData?.videoId ??
    item.videoId ??
    item.navigationEndpoint?.watchEndpoint?.videoId ??
    item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ??
    titleData?.runs?.find((run: Obj) => run.navigationEndpoint?.watchEndpoint?.videoId)?.navigationEndpoint?.watchEndpoint?.videoId;

  if (!videoId || !title) return null;

  const durationText =
    readText(item.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text) ||
    readText(item.lengthText);
  const durationSeconds = parseDuration(
    durationText || readText(item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text)
  );

  return {
    id: "youtube:" + videoId,
    source: "youtube_music",
    sourceTrackId: videoId,
    youtubeVideoId: videoId,
    youtubeUrl: "https://music.youtube.com/watch?v=" + encodeURIComponent(videoId),
    permalink: "https://music.youtube.com/watch?v=" + encodeURIComponent(videoId),
    title,
    artist: artistFor(item),
    artwork: imageFor(item, videoId),
    durationMs: durationSeconds * 1000,
    isStreamable: true
  };
}

function mapPlaylist(item: Obj): MusicPlaylist | null {
  const browseId = browseIdFor(item);
  const endpointId = item.navigationEndpoint?.watchPlaylistEndpoint?.playlistId ?? "";
  const rawId = endpointId || browseId;
  const playlistId = rawId.startsWith("VL") ? rawId.slice(2) : rawId;
  const title = titleFor(item).trim();

  if ((!playlistId.startsWith("PL") && !playlistId.startsWith("RDCLAK")) || !title) return null;

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
    handle: "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
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
  // Query with Songs filter first, then fallback to unfiltered if needed
  const payload = await searchRequest(normalized, FILTER_SONGS);
  let tracks = collectRenderers(payload, "musicResponsiveListItemRenderer")
    .map(mapTrack)
    .filter((item): item is MusicTrack => Boolean(item));

  if (tracks.length === 0) {
    const fallbackPayload = await searchRequest(normalized);
    tracks = collectRenderers(fallbackPayload, "musicResponsiveListItemRenderer")
      .map(mapTrack)
      .filter((item): item is MusicTrack => Boolean(item));
  }

  return uniqueById(tracks).slice(0, limit);
}

export async function getDiscoveryTracks(limit = 20): Promise<MusicTrack[]> {
  return searchYouTubeMusicTracks("top hits songs", limit);
}

export async function searchYouTubeMusicPlaylists(query: string, limit = 12): Promise<MusicPlaylist[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized, FILTER_PLAYLISTS);
  return uniqueById(searchItems(payload).map(mapPlaylist).filter((item): item is MusicPlaylist => Boolean(item))).slice(0, limit);
}

export async function getFeaturedPlaylists(limit = 8): Promise<MusicPlaylist[]> {
  return searchYouTubeMusicPlaylists("popular music playlists", limit);
}

export async function searchYouTubeMusicArtists(query: string, limit = 20): Promise<MusicArtist[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized, FILTER_ARTISTS);
  return uniqueById(searchItems(payload).map(mapArtist).filter((item): item is MusicArtist => Boolean(item))).slice(0, limit);
}

/** Search YouTube Music album and EP shelves. */
export async function searchYouTubeMusicAlbums(query: string, limit = 20): Promise<MusicRelease[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const payload = await searchRequest(normalized, FILTER_ALBUMS);
  return uniqueById(searchItems(payload)
    .map(mapRelease)
    .filter((item): item is MusicRelease => Boolean(item))
    .filter((item) => /^(MPRE|OLAK|M)/.test(item.browseId)))
    .slice(0, limit);
}

/**
 * Fetches the "Up Next" / Radio queue for a track directly from InnerTube /next
 */
export async function getYouTubeMusicUpNextTracks(videoId: string, limit = 20): Promise<MusicTrack[]> {
  const cleanId = videoId.replace(/^youtube:/i, "").trim();
  if (!cleanId) return [];
  const payload = await innerTubePost(NEXT_URL, {
    videoId: cleanId,
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true
  });
  const panelItems = collectRenderers(payload, "playlistPanelVideoRenderer");
  const tracks = panelItems.map(mapTrack).filter((item): item is MusicTrack => Boolean(item));
  return uniqueById(tracks).slice(0, limit);
}

/**
 * Fetches tracks inside a YouTube Music playlist via InnerTube /browse
 */
export async function getYouTubeMusicPlaylistTracks(playlistId: string): Promise<MusicTrack[]> {
  const cleanId = playlistId.replace(/^youtube-playlist:/i, "").trim();
  const browseId = cleanId.startsWith("VL") ? cleanId : `VL${cleanId}`;
  const payload = await innerTubePost(BROWSE_URL, { browseId });
  const items = collectRenderers(payload, "musicResponsiveListItemRenderer");
  return uniqueById(items.map(mapTrack).filter((item): item is MusicTrack => Boolean(item)));
}

export async function openTrackInYouTubeMusic(track: MusicTrack): Promise<void> {
  if (!track.youtubeUrl) throw new Error("This track does not have a playable link.");
  await Linking.openURL(track.youtubeUrl);
}

/**
 * Loads an artist's native YouTube Music page catalogue for in-app discovery.
 * The artist browse ID is the UC... channel ID returned by artist search.
 */
export async function getYouTubeMusicArtistTracks(artistId: string, limit = 30): Promise<MusicTrack[]> {
  const browseId = artistId.trim();
  if (!browseId.startsWith("UC")) return [];
  const payload = await innerTubePost(BROWSE_URL, { browseId });
  return browseTracksWithContinuation(payload, limit);
}

export type MusicRelease = {
  id: string;
  browseId: string;
  title: string;
  subtitle: string;
  artwork: string;
  kind: "album" | "ep" | "single";
  trackCount: number;
};

function mapRelease(item: Obj): MusicRelease | null {
  const browseId = browseIdFor(item);
  const title = titleFor(item).trim();
  if (!browseId || !title) return null;
  const subtitle = readText(item.subtitle ?? item.subtitleText ?? item.shortBylineText ??
    item.subtitle?.runs ?? item.subtitle?.simpleText ??
    item.subtitle?.musicResponsiveListItemRenderer?.text ??
    item.subtitle?.musicTwoRowItemRenderer?.subtitle);
  const details = subtitle || readText(item.subtitle);
  const normalized = details.toLowerCase();
  const kind = /\bep\b/.test(normalized) ? "ep" : /\bsingle\b/.test(normalized) ? "single" : "album";
  const countMatch = details.match(/(\d+)\s*(?:songs?|tracks?)/i);
  return {
    id: "youtube-release:" + browseId,
    browseId,
    title,
    subtitle: details || (kind === "album" ? "Album" : kind === "ep" ? "EP" : "Single"),
    artwork: imageFor(item),
    kind,
    trackCount: countMatch ? Number(countMatch[1]) : 0
  };
}

/** Reads the artist's catalogue shelves, including album, EP and single cards. */
export async function getYouTubeMusicArtistReleases(artistId: string, limit = 30): Promise<MusicRelease[]> {
  const browseId = artistId.trim();
  if (!browseId.startsWith("UC")) return [];
  const collected: MusicRelease[] = [];
  const seenTokens = new Set<string>();
  let payload = await innerTubePost(BROWSE_URL, { browseId });

  // Artist pages can split discography shelves across continuation responses.
  // Follow those pages so older albums, EPs and singles are not silently omitted.
  for (let page = 0; page < 12; page += 1) {
    const cards = [
      ...collectRenderers(payload, "musicTwoRowItemRenderer"),
      ...collectRenderers(payload, "musicResponsiveListItemRenderer")
    ];
    collected.push(...cards
      .map(mapRelease)
      .filter((item): item is MusicRelease => Boolean(item))
      .filter((item) => /^(MPRE|OLAK|M)/.test(item.browseId)));

    const token = continuationTokens(payload).find((candidate) => !seenTokens.has(candidate));
    if (!token || uniqueById(collected).length >= limit) break;
    seenTokens.add(token);
    payload = await innerTubePost(BROWSE_URL, { continuation: token });
  }

  return uniqueById(collected).slice(0, limit);
}

/** Loads all playable tracks from an album, EP or single browse page. */
export async function getYouTubeMusicReleaseTracks(releaseBrowseId: string, limit = 100): Promise<MusicTrack[]> {
  const browseId = releaseBrowseId.trim();
  if (!browseId) return [];
  const payload = await innerTubePost(BROWSE_URL, { browseId });
  return browseTracksWithContinuation(payload, limit);
}
