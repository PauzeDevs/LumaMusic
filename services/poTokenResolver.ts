export type YouTubePoTokens = {
  contentToken: string;
  expiresAt: number;
};

type PendingRequest = {
  videoId: string;
  resolve: (value: YouTubePoTokens | null) => void;
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
const waiting: Array<{ requestId: string; videoId: string }> = [];

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

  if (
    !message.error &&
    typeof message.contentToken === "string" &&
    message.contentToken.length > 0 &&
    typeof message.expiresAt === "number"
  ) {
    resolve({
      contentToken: message.contentToken,
      expiresAt: message.expiresAt
    });
  } else {
    resolve(null);
  }
}

export async function resolveYouTubePoTokens(
  videoId: string
): Promise<YouTubePoTokens | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;

  const requestId = `luma-${Date.now()}-${++requestSequence}`;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    waiting.push({ requestId, videoId });
    flushQueue();

    // Token generation is best-effort. Playback continues through the normal
    // InnerTube/NewPipe routes if YouTube or the challenge runtime is unavailable.
    setTimeout(() => {
      const finish = pending.get(requestId);
      if (finish) {
        pending.delete(requestId);
        finish(null);
      }
    }, 35_000);
  });
}
