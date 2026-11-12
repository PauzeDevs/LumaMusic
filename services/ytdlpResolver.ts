import type { MusicTrack } from "../types/music";

/**
 * Compatibility shim for the legacy playback import.
 *
 * The yt-dlp resolver service has been removed. Keep this module as a
 * no-op so the existing InnerTube playback implementation remains untouched.
 * InnerTube is now the only active YouTube stream resolver.
 */
export async function resolveWithYtdlpService(
  _track: MusicTrack
): Promise<null> {
  return null;
}
