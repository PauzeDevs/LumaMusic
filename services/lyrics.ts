import type { MusicTrack } from "../types/music";

export type LyricLine = { time: number | null; text: string };
export type LyricsState =
  | { status: "unconfigured" | "loading" | "not_found" | "restricted" | "error" }
  | { status: "available"; lines: LyricLine[]; provider: string; copyright?: string; attribution?: { text: string; url?: string } };

type LrclibRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string | null;
  duration?: number | null;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

const API = "https://lrclib.net/api";
const CLIENT_HEADER = "LumaMusic/0.1.0 (https://github.com/PauzeDevs/LumaMusic)";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MISS_TTL = 10 * 60 * 1000;
const ERROR_TTL = 30 * 1000;
const cache = new Map<string, { expiresAt: number; value: LyricsState }>();
const inFlight = new Map<string, Promise<LyricsState>>();
const timestampPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

export function parseLrc(value: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const row of value.split(/\r?\n/)) {
    const timestamps = [...row.matchAll(timestampPattern)];
    const text = row.replace(timestampPattern, "").trim();
    if (!text) continue;
    if (timestamps.length === 0) {
      lines.push({ time: null, text });
      continue;
    }
    for (const match of timestamps) {
      lines.push({
        time: Number(match[1]) * 60 + Number(match[2]) + (match[3] ? Number(`0.${match[3]}`) : 0),
        text
      });
    }
  }
  return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function recordMatches(record: LrclibRecord, track: MusicTrack): boolean {
  const wantedTitle = normalize(track.title);
  const wantedArtist = normalize(track.artist);
  const actualTitle = normalize(record.trackName);
  const actualArtist = normalize(record.artistName);
  const titleMatch = actualTitle === wantedTitle || actualTitle.includes(wantedTitle) || wantedTitle.includes(actualTitle);
  const artistMatch = actualArtist === wantedArtist || actualArtist.includes(wantedArtist) || wantedArtist.includes(actualArtist);
  if (!titleMatch || !artistMatch) return false;
  const duration = (track.durationMs ?? 0) / 1000;
  return !duration || !record.duration || Math.abs(record.duration - duration) <= 8;
}

function toLyricsState(record: LrclibRecord): LyricsState {
  if (record.instrumental) return { status: "not_found" };
  const synced = record.syncedLyrics?.trim();
  const plain = record.plainLyrics?.trim();
  const lines = synced ? parseLrc(synced) : plain
    ? plain.split(/\r?\n/).map((text) => ({ time: null, text: text.trim() })).filter((line) => line.text)
    : [];
  if (!lines.length) return { status: "not_found" };
  return {
    status: "available",
    lines,
    provider: "LRCLIB",
    copyright: "Lyrics sourced from the LRCLIB community database",
    attribution: { text: "View source on LRCLIB", url: `https://lrclib.net/api/get/${record.id}` }
  };
}

async function requestJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: { "Lrclib-Client": CLIENT_HEADER, Accept: "application/json" },
      signal: controller.signal
    });
    if (response.status === 404) return null;
    if (response.status === 429) throw new Error("LRCLIB rate limit reached. Please try again shortly.");
    if (!response.ok) throw new Error(`LRCLIB request failed (${response.status}).`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLyrics(track: MusicTrack): Promise<LyricsState> {
  const duration = Math.round((track.durationMs ?? 0) / 1000);
  const exactParams = new URLSearchParams({ track_name: track.title, artist_name: track.artist });
  if (duration >= 1 && duration <= 3600) exactParams.set("duration", String(duration));

  try {
    const exact = await requestJson<LrclibRecord>(`${API}/get?${exactParams.toString()}`);
    if (exact && recordMatches(exact, track)) return toLyricsState(exact);

    // Search fallback handles alternate cuts and small duration metadata differences.
    const searchParams = new URLSearchParams({ q: `${track.title} ${track.artist}` });
    const results = await requestJson<LrclibRecord[]>(`${API}/search?${searchParams.toString()}`);
    const match = results?.find((record) => recordMatches(record, track));
    return match ? toLyricsState(match) : { status: "not_found" };
  } catch {
    return { status: "error" };
  }
}

export function getLyrics(track: MusicTrack): Promise<LyricsState> {
  const key = `${normalize(track.title)}::${normalize(track.artist)}::${Math.round((track.durationMs ?? 0) / 1000)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  if (cached) cache.delete(key);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchLyrics(track).then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + (value.status === "not_found" ? MISS_TTL : value.status === "error" ? ERROR_TTL : CACHE_TTL) });
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
