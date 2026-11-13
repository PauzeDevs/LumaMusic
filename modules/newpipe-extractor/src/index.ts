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
};

const nativeModule =
  requireOptionalNativeModule<NewPipeNativeModule>("NewPipeExtractor");

export async function resolveWithNewPipe(
  videoId: string
): Promise<NewPipeAudioResult | null> {
  if (!nativeModule) return null;
  return nativeModule.extractAudio(videoId);
}
