import type { MusicTrack } from "../types/music";

export type LyricLine = { time: number | null; text: string };
type LrclibRecord = { id: number; trackName: string; artistName: string; duration: number; instrumental: boolean; plainLyrics: string | null; syncedLyrics: string | null };
export type LyricsState =
  | { status: "unconfigured" | "loading" | "not_found" | "restricted" | "error" }
  | { status: "available"; lines: LyricLine[]; provider: string; copyright?: string; attribution?: { text: string; url?: string } };

const API = "https://lrclib.net/api";
const CLIENT_HEADER = "LumaMusic/0.1.0 (https://github.com/PauzeDevs/LumaMusic)";
const timestampPattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

export function parseLrc(value: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const row of value.split(/\r?\n/)) {
    const timestamps = [...row.matchAll(timestampPattern)];
    const text = row.replace(timestampPattern, "").trim();
    if (!text) continue;
    if (!timestamps.length) { lines.push({ time: null, text }); continue; }
    for (const match of timestamps) lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + (match[3] ? Number("0." + match[3]) : 0), text });
  }
  return lines.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

function normalise(value: string) { return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
async function request<T>(url: string, signal: AbortSignal): Promise<{ status: number; data: T | null }> {
  const response = await fetch(url, { signal, headers: { "X-User-Agent": CLIENT_HEADER, Accept: "application/json" } });
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: await response.json() as T };
}
function toLyrics(record: LrclibRecord): LyricsState {
  if (record.instrumental || (!record.syncedLyrics?.trim() && !record.plainLyrics?.trim())) return { status: "not_found" };
  const synced = record.syncedLyrics?.trim();
  const plain = record.plainLyrics?.trim();
  const lines = synced ? parseLrc(synced) : (plain ?? "").split(/\r?\n/).map((text) => ({ time: null, text: text.trim() })).filter((line) => line.text);
  return lines.length ? { status: "available", lines, provider: "LRCLIB", copyright: "Lyrics metadata provided by LRCLIB" } : { status: "not_found" };
}

export async function getLyrics(track: MusicTrack): Promise<LyricsState> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const duration = Math.round((track.durationMs ?? 0) / 1000);
    const params = new URLSearchParams({ track_name: track.title, artist_name: track.artist });
    if (duration > 0 && duration <= 3600) params.set("duration", String(duration));
    const exact = await request<LrclibRecord>(API + "/get?" + params.toString(), controller.signal);
    if (exact.status === 200 && exact.data) return toLyrics(exact.data);
    if (exact.status === 429) return { status: "error" };
    if (exact.status !== 404) return { status: "error" };
    const searchParams = new URLSearchParams({ track_name: track.title, artist_name: track.artist });
    const search = await request<LrclibRecord[]>(API + "/search?" + searchParams.toString(), controller.signal);
    if (search.status !== 200 || !search.data?.length) return search.status === 200 ? { status: "not_found" } : { status: "error" };
    const title = normalise(track.title); const artist = normalise(track.artist);
    const candidates = search.data.filter((item) => normalise(item.trackName) === title && normalise(item.artistName) === artist && (!duration || !item.duration || Math.abs(item.duration - duration) <= 8));
    const match = candidates.find((item) => item.syncedLyrics?.trim()) ?? candidates.find((item) => item.plainLyrics?.trim()) ?? candidates[0];
    return match ? toLyrics(match) : { status: "not_found" };
  } catch { return { status: "error" }; } finally { clearTimeout(timeout); }
}