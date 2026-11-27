export const MAX_STREAM_DURATION_SECONDS = 24 * 60 * 60;

export function validateStreamUrl(rawUrl: unknown, label: string): string {
  if (typeof rawUrl !== "string" || rawUrl.length > 16_384) {
    throw new Error(`${label}: invalid stream URL`);
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label}: malformed stream URL`);
  }
  const host = parsed.hostname.toLowerCase();
  const trustedHost = host === "googlevideo.com" || host.endsWith(".googlevideo.com") ||
    host === "youtube.com" || host.endsWith(".youtube.com");
  if (parsed.protocol !== "https:" || !trustedHost || parsed.username || parsed.password) {
    throw new Error(`${label}: rejected untrusted stream URL`);
  }
  return parsed.toString();
}

export function safeDuration(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_STREAM_DURATION_SECONDS) return fallback;
  return Math.round(parsed);
}

export function boundedExpiry(candidate: unknown, fallbackMs = 30 * 60 * 1000): number {
  const now = Date.now();
  const parsed = Number(candidate);
  const fallback = now + Math.min(Math.max(fallbackMs, 60_000), 24 * 60 * 60 * 1000);
  if (!Number.isFinite(parsed) || parsed < now + 60_000) return fallback;
  return Math.min(parsed, now + 24 * 60 * 60 * 1000);
}

export function safeBitrate(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000
    ? Math.round(parsed)
    : undefined;
}
