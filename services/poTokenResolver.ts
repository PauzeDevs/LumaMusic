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

function flushQueue() {
  if (!sendToWebView) return;
  while (waiting.length) {
    const next = waiting.shift();
    if (next) sendToWebView(next.requestId, next.videoId);
  }
}

export function attachPoTokenWebView(
  sender: (requestId: string, videoId: string) => void
) {
  sendToWebView = sender;
  flushQueue();
  return () => {
    if (sendToWebView === sender) sendToWebView = null;
  };
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
    const tokens = {
      contentToken: message.contentToken,
      expiresAt: message.expiresAt
    };
    tokenCache.set(message.requestId.split(":")[0], tokens);
    resolve(tokens);
  } else {
    resolve(null);
  }
}

export async function resolveYouTubePoTokens(
  videoId: string
): Promise<YouTubePoTokens | null> {
  if (Platform.OS !== "android" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return null;
  }

  const cached = tokenCache.get(videoId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached;

  const requestId = `${videoId}:${Date.now()}:${++requestSequence}`;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    waiting.push({ requestId, videoId });
    flushQueue();

    // Best-effort: if the challenge runtime is unavailable, playback continues
    // through the normal InnerTube and NewPipe routes without a PoToken.
    const timer = setTimeout(() => {
      const finish = pending.get(requestId);
      pending.delete(requestId);
      pendingTimers.delete(requestId);
      // Remove timed-out work before a WebView becomes available, otherwise
      // stale requests accumulate and are needlessly dispatched later.
      const queuedIndex = waiting.findIndex((item) => item.requestId === requestId);
      if (queuedIndex >= 0) waiting.splice(queuedIndex, 1);
      finish?.(null);
    }, 12_000);
    pendingTimers.set(requestId, timer);
  });
}
