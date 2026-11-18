import type { MusicTrack } from "../types/music";

export type LyricWord = { time: number; text: string };
export type LyricLine = { time: number | null; text: string; words?: LyricWord[] };
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
const MAX_LYRICS_CACHE_ENTRIES = 32;
const inFlight = new Map<string, Promise<LyricsState>>();
const timestampPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const wordTimestampPattern = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;
const metadataPattern = /^\[(?:ar|ti|al|by|re|ve|length|kana|la|au|tool):[^\]]*\]$/i;

function timestampSeconds(minutes: string, seconds: string, fraction?: string): number {
  return Number(minutes) * 60 + Number(seconds) + (fraction ? Number("0." + fraction) : 0);
}

/** Parses standard LRC, multi-timestamp LRC and enhanced LRC word timestamps. */
export function parseLrc(value: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let offsetSeconds = 0;

  for (const row of value.split(/\r?\n/)) {
    const trimmed = row.trim();
    const offsetMatch = trimmed.match(/^\[offset:([+-]?\d+)\]$/i);
    if (offsetMatch) {
      const offsetMs = Number(offsetMatch[1]);
      if (Number.isFinite(offsetMs)) offsetSeconds = offsetMs / 1000;
      continue;
    }
    if (!trimmed || metadataPattern.test(trimmed)) continue;

    const timestamps = [...row.matchAll(timestampPattern)];
    const content = row.replace(timestampPattern, "");
    const wordMatches = [...content.matchAll(wordTimestampPattern)];
    const text = content.replace(wordTimestampPattern, "").trim();
    if (!text || /^\[[a-z]+:[^\]]*\]$/i.test(text)) continue;

    const words: LyricWord[] = [];
    if (wordMatches.length > 0) {
      const firstIndex = wordMatches[0].index ?? 0;
      const prefix = content.slice(0, firstIndex);
      if (prefix.trim()) {
        words.push({
          time: Math.max(0, (timestamps[0] ? timestampSeconds(timestamps[0][1], timestamps[0][2], timestamps[0][3]) : 0) + offsetSeconds),
          text: prefix
        });
      }
      wordMatches.forEach((match, index) => {
        const segmentStart = (match.index ?? 0) + match[0].length;
        const segmentEnd = index + 1 < wordMatches.length ? (wordMatches[index + 1].index ?? content.length) : content.length;
        const wordText = content.slice(segmentStart, segmentEnd);
        if (!wordText.trim()) return;
        words.push({
          time: Math.max(0, timestampSeconds(match[1], match[2], match[3]) + offsetSeconds),
          text: wordText
        });
      });
    }

    if (timestamps.length === 0) {
      if (words.length > 0) lines.push({ time: words[0].time, text, words });
      else lines.push({ time: null, text });
      continue;
    }

    for (const match of timestamps) {
      const lineTime = Math.max(0, timestampSeconds(match[1], match[2], match[3]) + offsetSeconds);
      lines.push({ time: lineTime, text, ...(words.length > 0 ? { words } : {}) });
    }
  }

  return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

function normalize(value: string): string {
  // Keep Unicode letters and numbers so Punjabi, Hindi and other non-Latin
  // artist/title metadata can be matched instead of collapsing to empty text.
  return value.toLocaleLowerCase().normalize("NFKC")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function recordMatches(record: LrclibRecord, track: MusicTrack): boolean {
  const wantedTitle = normalize(track.title);
  const wantedArtist = normalize(track.artist);
  const actualTitle = normalize(record.trackName);
  const actualArtist = normalize(record.artistName);
  if (!wantedTitle || !wantedArtist || !actualTitle || !actualArtist) return false;
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
  if (cached && cached.expiresAt > Date.now()) {
    cache.delete(key);
    cache.set(key, cached);
    return Promise.resolve(cached.value);
  }
  if (cached) cache.delete(key);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchLyrics(track).then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + (value.status === "not_found" ? MISS_TTL : value.status === "error" ? ERROR_TTL : CACHE_TTL) });
    while (cache.size > MAX_LYRICS_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
