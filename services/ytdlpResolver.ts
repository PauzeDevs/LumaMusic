import type { MusicTrack } from "../types/music";

export type ResolvedYtdlpAudio = {
  url: string;
  durationSeconds?: number;
};

export async function resolveWithYtdlpService(
  _track: MusicTrack
): Promise<ResolvedYtdlpAudio | null> {
  return null;
}

