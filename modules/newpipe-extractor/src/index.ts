import { requireOptionalNativeModule } from "expo-modules-core";

export type NewPipeAudioResult = {
  url: string;
  mimeType: string;
  durationSeconds: number;
  bitrate: number;
  userAgent: string;
};

type NewPipeNativeModule = {
  extractAudio(videoId: string): Promise<NewPipeAudioResult>;
  cancelExtraction(videoId: string): void;
};

const nativeModule =
  requireOptionalNativeModule<NewPipeNativeModule>("NewPipeExtractor");

export async function resolveWithNewPipe(
  videoId: string,
  signal?: AbortSignal
): Promise<NewPipeAudioResult | null> {
  if (!nativeModule) return null;
  if (signal?.aborted) {
    nativeModule.cancelExtraction(videoId);
    return null;
  }

  let abortHandler: (() => void) | undefined;
  try {
    const extraction = nativeModule.extractAudio(videoId);
    if (!signal) return await extraction;

    const aborted = new Promise<null>((resolve) => {
      abortHandler = () => {
        nativeModule.cancelExtraction(videoId);
        resolve(null);
      };
      signal.addEventListener("abort", abortHandler, { once: true });
    });
    return await Promise.race([extraction, aborted]);
  } finally {
    if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}
