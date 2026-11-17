import { resolveWithNewPipe as resolveNativeNewPipe } from "../modules/newpipe-extractor/src";

export type ResolvedNewPipeAudio = {
  url: string;
  mimeType: string;
  durationSeconds: number;
  bitrate: number;
  userAgent: string;
};

/**
 * Android-only NewPipe fallback. The native module is optional so iOS continues
 * to use the existing InnerTube resolver without importing Android classes.
 */
export async function resolveWithNewPipe(
  videoId: string
): Promise<ResolvedNewPipeAudio | null> {
  try {
    return await resolveNativeNewPipe(videoId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`NewPipe extraction failed: ${message}`);
  }
}
