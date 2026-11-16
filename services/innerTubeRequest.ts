type InnerTubePayload = Record<string, unknown>;

type RequestOptions = {
  cacheTtlMs?: number;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

type CacheEntry = { value: InnerTubePayload; expiresAt: number };
type Diagnostic = { requests: number; successes: number; failures: number; rateLimited: number; serverErrors: number; totalLatencyMs: number; lastStatus?: number; circuitOpenUntil: number };

const MAX_CONCURRENT_REQUESTS = 3;
const MAX_CACHE_ENTRIES = 60;
const MAX_RETRY_AFTER_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<InnerTubePayload>>();
const diagnostics = new Map<string, Diagnostic>();
const queue: Array<() => void> = [];
let activeRequests = 0;

function endpointFor(url: string): string {
  const match = url.match(/youtubei\/v1\/(search|browse|next|player)/i);
  return match?.[1]?.toLowerCase() ?? "other";
}

function diagnostic(endpoint: string): Diagnostic {
  let value = diagnostics.get(endpoint);
  if (!value) {
    value = { requests: 0, successes: 0, failures: 0, rateLimited: 0, serverErrors: 0, totalLatencyMs: 0, circuitOpenUntil: 0 };
    diagnostics.set(endpoint, value);
  }
  return value;
}

function stableKey(url: string, body: InnerTubePayload): string {
  return url + "|" + JSON.stringify(body);
}

function readCache(key: string): InnerTubePayload | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function writeCache(key: string, value: InnerTubePayload, ttlMs: number) {
  if (ttlMs <= 0) return;
  cache.delete(key);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  activeRequests += 1;
}

function releaseSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
  queue.shift()?.();
}

function retryAfterMs(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) && value.trim() !== ""
    ? seconds * 1000
    : Math.max(0, Date.parse(value) - Date.now());
  return Number.isFinite(delay) ? Math.max(0, delay) : null;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("InnerTube request cancelled."));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new Error("InnerTube request cancelled."));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function failureMessage(endpoint: string, status?: number, retryMs?: number | null): string {
  const suffix = retryMs != null ? " Retry after " + Math.ceil(retryMs / 1000) + " seconds." : "";
  return "YouTube InnerTube " + endpoint + " request failed" + (status ? " (HTTP " + status + ")" : "") + "." + suffix;
}

async function performRequest(url: string, body: InnerTubePayload, options: RequestOptions): Promise<InnerTubePayload> {
  const endpoint = endpointFor(url);
  const stats = diagnostic(endpoint);
  if (stats.circuitOpenUntil > Date.now()) {
    throw new Error("YouTube InnerTube " + endpoint + " is temporarily paused after repeated upstream failures. Try again shortly.");
  }
  stats.circuitOpenUntil = 0;

  const maxRetries = Math.max(0, Math.min(options.maxRetries ?? 2, 2));
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let retryDelay: number | null = null;
    try {
      const payload = await (async () => {
        await acquireSlot();
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.max(1000, options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
        const abortFromCaller = () => controller.abort();
        options.signal?.addEventListener("abort", abortFromCaller, { once: true });
        stats.requests += 1;
        try {
          const response = await fetch(url, {
            method: "POST",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Origin: url.includes("music.youtube.com") ? "https://music.youtube.com" : "https://www.youtube.com",
              Referer: url.includes("music.youtube.com") ? "https://music.youtube.com/" : "https://www.youtube.com/",
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
              ...options.headers
            },
            body: JSON.stringify(body)
          });
          if (!response.ok) {
            const status = response.status;
            const retryMs = retryAfterMs(response);
            stats.lastStatus = status;
            if (status === 429) stats.rateLimited += 1;
            if (status >= 500) stats.serverErrors += 1;
            const retryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
            if (retryable && attempt < maxRetries && (retryMs == null || retryMs <= MAX_RETRY_AFTER_MS)) {
              retryDelay = retryMs ?? Math.round(Math.min(6000, 500 * Math.pow(2, attempt)) * (0.75 + Math.random() * 0.5));
              throw new Error("RETRYABLE_INNERTUBE_HTTP_" + status);
            }
            throw new Error(failureMessage(endpoint, status, retryMs));
          }
          const contentLength = Number(response.headers.get("content-length") || 0);
          if (contentLength > 5 * 1024 * 1024) throw new Error("YouTube returned an unusually large response.");
          const text = await response.text();
          if (text.length > 5 * 1024 * 1024) throw new Error("YouTube returned an unusually large response.");
          try {
            return JSON.parse(text) as InnerTubePayload;
          } catch {
            throw new Error("YouTube returned an invalid InnerTube response.");
          }
        } finally {
          clearTimeout(timeout);
          options.signal?.removeEventListener("abort", abortFromCaller);
          stats.totalLatencyMs += Date.now() - startedAt;
          releaseSlot();
        }
      })();

      stats.successes += 1;
      stats.failures = 0;
      stats.circuitOpenUntil = 0;
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (options.signal?.aborted) throw new Error("InnerTube request cancelled.");

      const retryableHttp = lastError.message.startsWith("RETRYABLE_INNERTUBE_HTTP_");
      const httpFailure = /HTTP \d+/.test(lastError.message);
      const retryableNetwork = !httpFailure && !lastError.message.includes("unusually large") && !lastError.message.includes("invalid InnerTube");
      if (!retryableHttp && !retryableNetwork) {
        stats.failures += 1;
        if (stats.failures >= 4) stats.circuitOpenUntil = Date.now() + 15_000;
        throw lastError;
      }
      stats.failures += 1;
      if (stats.failures >= 4) stats.circuitOpenUntil = Date.now() + 15_000;
      if (attempt >= maxRetries) throw lastError;
      const delay = retryDelay ?? Math.min(6000, 500 * Math.pow(2, attempt));
      await wait(delay, options.signal);
    }
  }
  throw lastError ?? new Error(failureMessage(endpoint));
}

export function requestInnerTubeJson(
  url: string,
  body: InnerTubePayload,
  options: RequestOptions = {}
): Promise<InnerTubePayload> {
  const key = stableKey(url, body);
  const cached = options.cacheTtlMs ? readCache(key) : null;
  if (cached) return Promise.resolve(cached);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = performRequest(url, body, options)
    .then((payload) => {
      if (options.cacheTtlMs) writeCache(key, payload, options.cacheTtlMs);
      return payload;
    })
    .finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

/** Aggregated, in-memory diagnostics. No query text, video IDs or user data are retained. */
export function getInnerTubeDiagnostics() {
  return Array.from(diagnostics.entries()).map(([endpoint, value]) => ({
    endpoint,
    requests: value.requests,
    successes: value.successes,
    failures: value.failures,
    rateLimited: value.rateLimited,
    serverErrors: value.serverErrors,
    averageLatencyMs: value.requests ? Math.round(value.totalLatencyMs / value.requests) : 0,
    circuitOpen: value.circuitOpenUntil > Date.now()
  }));
}

export function clearInnerTubeCache() {
  cache.clear();
}
