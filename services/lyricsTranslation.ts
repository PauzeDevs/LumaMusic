import type { LyricLine } from "./lyrics";

const CACHE_LIMIT = 80;
const cache = new Map<string, string>();

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function translateBatch(lines: string[], language: string, signal?: AbortSignal): Promise<string[]> {
  const source = lines.join("\n");
  const params = new URLSearchParams({ q: source, langpair: `auto|${language}` });
  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal
  });
  if (!response.ok) throw new Error(`Translation service returned ${response.status}.`);
  const payload = await response.json() as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const translated = payload.responseData?.translatedText;
  if (payload.responseStatus !== 200 || typeof translated !== "string") {
    throw new Error("Translation service could not translate this section.");
  }
  const result = decodeEntities(translated).split(/\r?\n/);
  return lines.map((_, index) => result[index]?.trim() || translated.trim());
}

/** Translates lyric lines in small batches; original timestamps and word timing remain untouched. */
export async function translateLyricLines(
  lines: LyricLine[],
  language: string,
  signal?: AbortSignal
): Promise<string[]> {
  const output = new Array<string>(lines.length);
  const pending: Array<{ index: number; text: string }> = [];
  lines.forEach((line, index) => {
    const key = `${language}::${line.text}`;
    const cached = cache.get(key);
    if (cached) output[index] = cached;
    else if (line.text.trim()) pending.push({ index, text: line.text });
    else output[index] = "";
  });

  for (let start = 0; start < pending.length;) {
    if (signal?.aborted) throw new Error("Translation cancelled.");
    const batch: typeof pending = [];
    let length = 0;
    while (start < pending.length && batch.length < 8) {
      const next = pending[start];
      if (batch.length && length + next.text.length + 1 > 450) break;
      batch.push(next);
      length += next.text.length + 1;
      start += 1;
    }
    const translated = await translateBatch(batch.map((item) => item.text), language, signal);
    batch.forEach((item, index) => {
      const value = translated[index] ?? item.text;
      output[item.index] = value;
      const key = `${language}::${item.text}`;
      cache.set(key, value);
      while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    });
  }
  return output;
}
