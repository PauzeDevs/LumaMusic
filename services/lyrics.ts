import type { MusicTrack } from "../types/music";

export type LyricLine = { time: number | null; text: string };
export type LyricsResult = {
  status: "available" | "not_found" | "restricted";
  format?: "lrc" | "plain";
  lyrics?: string;
  provider?: string;
  copyright?: string;
  attribution?: { text: string; url?: string };
};
export type LyricsState =
  | { status: "unconfigured" | "loading" | "not_found" | "restricted" | "error" }
  | { status: "available"; lines: LyricLine[]; provider: string; copyright?: string; attribution?: LyricsResult["attribution"] };

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

export async function getLyrics(track: MusicTrack, signal?: AbortSignal): Promise<LyricsState> {
  const endpoint = process.env.EXPO_PUBLIC_LYRICS_API_URL?.trim();
  if (!endpoint) return { status: "unconfigured" };
  const params = new URLSearchParams({
    source: track.source,
    sourceTrackId: track.sourceTrackId ?? "",
    title: track.title,
    artist: track.artist,
    durationMs: String(track.durationMs ?? 0)
  });
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/v1/lyrics?${params.toString()}`);
    if (response.status === 404) return { status: "not_found" };
    if (response.status === 403) return { status: "restricted" };
    if (!response.ok) return { status: "error" };
    const result = (await response.json()) as LyricsResult;
    if (result.status === "restricted") return { status: "restricted" };
    if (result.status !== "available" || !result.lyrics?.trim()) return { status: "not_found" };
    const lines = result.format === "plain"
      ? result.lyrics.split(/\r?\n/).map((text) => ({ time: null, text: text.trim() })).filter((line) => line.text)
      : parseLrc(result.lyrics);
    if (!lines.length) return { status: "not_found" };
    return { status: "available", lines, provider: result.provider ?? "Licensed lyrics provider", copyright: result.copyright, attribution: result.attribution };
  } catch {
    return { status: "error" };
  }
}
