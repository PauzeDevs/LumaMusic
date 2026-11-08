export type ImportedPlaylistEntry = {
  title: string;
  artist: string;
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseLooseLine(value: string): ImportedPlaylistEntry | null {
  const line = value.replace(/^\uFEFF/, "").replace(/^\s*\d+[\.)]\s*/, "").trim();
  if (!line || line.startsWith("#")) return null;
  const extInf = line.match(/^#EXTINF:[^,]*,(.+)$/i);
  if (extInf) return parseLooseLine(extInf[1]);
  const parts = line.split(/\s+(?:-|–|—|•)\s+/);
  const title = (parts[0] ?? "").trim();
  const artist = parts.length > 1 ? parts.slice(1).join(" - ").trim() : "";
  if (!title || /^https?:\/\//i.test(title)) return null;
  return { title, artist };
}

export function parsePlaylistExport(raw: string): ImportedPlaylistEntry[] {
  const input = raw.replace(/^\uFEFF/, "").trim();
  if (!input) return [];

  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(input, delimiter);
  const headers = (rows[0] ?? []).map(normalizeHeader);
  const titleAliases = ["track name", "track title", "title", "track", "song", "name"];
  const artistAliases = ["artist name s", "artist names", "artist name", "artists", "artist", "performer", "album artist"];
  const titleIndex = headers.findIndex((header) => titleAliases.includes(header));
  const artistIndex = headers.findIndex((header) => artistAliases.includes(header));

  let entries: ImportedPlaylistEntry[] = [];
  if (titleIndex >= 0) {
    entries = rows.slice(1).map((row) => ({
      title: (row[titleIndex] ?? "").trim(),
      artist: artistIndex >= 0 ? (row[artistIndex] ?? "").trim() : ""
    })).filter((entry) => entry.title.length > 0);
  } else {
    entries = input.split(/\r?\n/).map(parseLooseLine).filter((entry): entry is ImportedPlaylistEntry => Boolean(entry));
  }

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = normalizeHeader(entry.title) + "|" + normalizeHeader(entry.artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
}