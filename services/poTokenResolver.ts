import { Platform } from "react-native";

export type YouTubePoTokens = {
  contentToken: string;
  expiresAt: number;
};

type TokenMessage = {
  type: "potoken-result";
  requestId: string;
  contentToken?: string;
  expiresAt?: number;
  error?: string;
};

let requestSequence = 0;
let sendToWebView: ((requestId: string, videoId: string) => void) | null = null;
const pending = new Map<string, (value: YouTubePoTokens | null) => void>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const waiting: Array<{ requestId: string; videoId: string }> = [];
const tokenCache = new Map<string, YouTubePoTokens>();
const demandListeners = new Set<(active: boolean) => void>();

function notifyDemand() {
  const active = pending.size > 0;
  demandListeners.forEach((listener) => listener(active));
}

export function subscribePoTokenDemand(listener: (active: boolean) => void) {
  demandListeners.add(listener);
  listener(pending.size > 0);
  return () => { demandListeners.delete(listener); };
}

function flushQueue() {
  if (!sendToWebView) return;
  while (waiting.length) {
    const next = waiting.shift();
    if (next) sendToWebView(next.requestId, next.videoId);
  }
}

export function attachPoTokenWebView(sender: (requestId: string, videoId: string) => void) {
  sendToWebView = sender;
  flushQueue();
  return () => {
    if (sendToWebView === sender) sendToWebView = null;
  };
}

/** Resolve outstanding work when Android destroys the WebView renderer. */
export function failPendingPoTokenRequests() {
  for (const [requestId, resolve] of pending) {
    const timer = pendingTimers.get(requestId);
    if (timer) clearTimeout(timer);
    pendingTimers.delete(requestId);
    resolve(null);
  }
  pending.clear();
  waiting.length = 0;
  sendToWebView = null;
  notifyDemand();
}

export function handlePoTokenWebViewMessage(message: TokenMessage) {
  if (message.type !== "potoken-result") return;
  const resolve = pending.get(message.requestId);
  if (!resolve) return;
  pending.delete(message.requestId);
  const timer = pendingTimers.get(message.requestId);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(message.requestId);

  if (
    !message.error &&
    typeof message.contentToken === "string" &&
    message.contentToken.length > 0 &&
    typeof message.expiresAt === "number"
  ) {
    const tokens = { contentToken: message.contentToken, expiresAt: message.expiresAt };
    const videoId = message.requestId.split(":")[0];
    tokenCache.set(videoId, tokens);
    // Keep this cache bounded for long listening sessions.
    if (tokenCache.size > 8) {
      const oldestKey = tokenCache.keys().next().value;
      if (oldestKey) tokenCache.delete(oldestKey);
    }
    resolve(tokens);
  } else {
    resolve(null);
  }
  notifyDemand();
}

export async function resolveYouTubePoTokens(videoId: string, timeoutMs = 12_000): Promise<YouTubePoTokens | null> {
  if (Platform.OS !== "android" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

  const cached = tokenCache.get(videoId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;
  if (cached) tokenCache.delete(videoId);

  const requestId = `${videoId}:${Date.now()}:${++requestSequence}`;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    waiting.push({ requestId, videoId });
    notifyDemand();
    flushQueue();

    const timer = setTimeout(() => {
      const finish = pending.get(requestId);
      pending.delete(requestId);
      pendingTimers.delete(requestId);
      const queuedIndex = waiting.findIndex((item) => item.requestId === requestId);
      if (queuedIndex >= 0) waiting.splice(queuedIndex, 1);
      finish?.(null);
      notifyDemand();
    }, 12_000);
    pendingTimers.set(requestId, timer);
  });
}
