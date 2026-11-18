export type ImportedPlaylistEntry = {
  title: string;
  artist: string;
};

function normalizeHeader(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKC").replace(/[\\u0300-\\u036f]/g, "").replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
}

function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "\"") {
      if (quoted && input[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
      if (cell.length > 4096) {
        throw new Error("A playlist field is too long. Please check the export and try again.");
      }
    }
    if (!quoted && (char === "\n" || char === "\r") && rows.length >= 500) break;
  }

  if (quoted) return [];
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function artistText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) {
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return artistText(record.name ?? record.artistName ?? record.artist);
    }
    return "";
  }
  return value.map(artistText).filter(Boolean).join(", ");
}

function parseJsonExport(input: string): ImportedPlaylistEntry[] {
  let root: unknown;
  try {
    root = JSON.parse(input);
  } catch {
    return [];
  }

  const entries: ImportedPlaylistEntry[] = [];
  const stack: unknown[] = [root];
  let visited = 0;
  while (stack.length > 0 && visited < 50_000 && entries.length < 500) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visited += 1;

    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) stack.push(current[index]);
      continue;
    }

    const record = current as Record<string, unknown>;
    const nestedTrack = record.track && typeof record.track === "object"
      ? record.track as Record<string, unknown>
      : record.song && typeof record.song === "object"
        ? record.song as Record<string, unknown>
        : record;
    const titleValue = nestedTrack.trackName ?? nestedTrack.title ?? nestedTrack.name;
    const artistValue = nestedTrack.artistName ?? nestedTrack.artistNames ?? nestedTrack.artists ?? nestedTrack.artist ?? nestedTrack.performer;
    if (typeof titleValue === "string" && titleValue.trim() && artistValue !== undefined) {
      const artist = artistText(artistValue);
      if (artist) entries.push({ title: titleValue.trim(), artist });
    }

    const values = Object.values(record);
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (values[index] && typeof values[index] === "object") stack.push(values[index]);
    }
  }
  return entries;
}

function parseLooseLine(value: string): ImportedPlaylistEntry | null {
  const line = value.replace(/^\uFEFF/, "").replace(/^\s*\d+[.)]\s*/, "").trim();
  if (!line) return null;

  const extInf = line.match(/^#EXTINF:[^,]*,(.+)$/i);
  if (extInf) {
    const fields = extInf[1].split(/\s+-\s+/, 2);
    if (fields.length === 2) return { artist: fields[0].trim(), title: fields[1].trim() };
    return { title: extInf[1].trim(), artist: "" };
  }
  const plsTitle = line.match(/^Title\d+\s*=\s*(.+)$/i);
  if (plsTitle) return { title: plsTitle[1].trim(), artist: "" };
  if (line.startsWith("#") || /^File\d+\s*=/i.test(line) || /^https?:\/\//i.test(line)) return null;

  const parts = line.split(/\s+(?:-|–|—|•)\s+/);
  const title = (parts[0] ?? "").trim();
  const artist = parts.length > 1 ? parts.slice(1).join(" - ").trim() : "";
  return title ? { title, artist } : null;
}

function uniqueEntries(entries: ImportedPlaylistEntry[]): ImportedPlaylistEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const title = entry.title.trim();
    const artist = entry.artist.trim();
    if (!title) return false;
    const key = normalizeHeader(title) + "|" + normalizeHeader(artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
}

/**
 * Accepts common playlist exports (CSV/TSV, Spotify-style JSON, M3U/PLS and
 * plain title/artist lists). Audio and account data are never copied.
 */
export function parsePlaylistExport(raw: string): ImportedPlaylistEntry[] {
  if (raw.length > 512 * 1024) {
    throw new Error("This playlist export is too large. Please keep it under 512 KB.");
  }
  const input = raw.replace(/^\uFEFF/, "").trim();
  if (!input) return [];

  if (input.startsWith("{") || input.startsWith("[")) {
    const jsonEntries = parseJsonExport(input);
    if (jsonEntries.length > 0) return uniqueEntries(jsonEntries);
  }

  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(input, delimiter);
  const headers = (rows[0] ?? []).map(normalizeHeader);
  const titleAliases = ["track name", "trackname", "track title", "song title", "song name", "title", "track", "song", "name"];
  const artistAliases = ["artist name s", "artist names", "artist name", "artists", "artist", "performer", "album artist"];
  const titleIndex = headers.findIndex((header) => titleAliases.includes(header));
  const artistIndex = headers.findIndex((header) => artistAliases.includes(header));

  if (titleIndex >= 0) {
    const entries = rows.slice(1).map((row) => ({
      title: (row[titleIndex] ?? "").trim(),
      artist: artistIndex >= 0 ? (row[artistIndex] ?? "").trim() : ""
    })).filter((entry) => entry.title.length > 0);
    if (entries.length > 0) return uniqueEntries(entries);
  }

  return uniqueEntries(input.split(/\r?\n/, 501)
    .map(parseLooseLine)
    .filter((entry): entry is ImportedPlaylistEntry => Boolean(entry)));
}
