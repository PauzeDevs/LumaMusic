import { requireOptionalNativeModule } from "expo-modules-core";

export type NewPipeAudioResult = {
  url: string;
  mimeType: string;
  durationSeconds: number;
  bitrate: number;
  userAgent: string;
};

type NewPipeNativeModule = {
  extractAudio(videoId: string, requestId: string): Promise<NewPipeAudioResult>;
  cancelExtraction(requestId: string): void;
};

const nativeModule =
  requireOptionalNativeModule<NewPipeNativeModule>("NewPipeExtractor");
let nextRequestId = 0;

function createRequestId(): string {
  nextRequestId = (nextRequestId + 1) % Number.MAX_SAFE_INTEGER;
  return `newpipe-${nextRequestId}`;
}

export async function resolveWithNewPipe(
  videoId: string,
  signal?: AbortSignal
): Promise<NewPipeAudioResult | null> {
  if (!nativeModule || signal?.aborted) return null;

  const requestId = createRequestId();
  let abortHandler: (() => void) | undefined;
  let aborted: Promise<null> | undefined;

  try {
    if (signal) {
      aborted = new Promise<null>((resolve) => {
        abortHandler = () => {
          nativeModule.cancelExtraction(requestId);
          resolve(null);
        };
        signal.addEventListener("abort", abortHandler, { once: true });
      });
    }

    // The request ID is unique per extraction: cancelling one playback attempt
    // must not disconnect another attempt for the same YouTube video.
    const extraction = nativeModule.extractAudio(videoId, requestId);
    if (signal?.aborted) abortHandler?.();

    return await (aborted
      ? Promise.race([extraction, aborted])
      : extraction);
  } finally {
    if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}
