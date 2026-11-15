import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MusicTrack } from "../types/music";

const STORAGE_KEY = "lumamusic-playback-recovery-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PlaybackRecoverySnapshot = {
  version: 1;
  savedAt: number;
  currentTrack: MusicTrack;
  queue: MusicTrack[];
  currentQueueIndex: number;
  playbackPosition: number;
  playbackDuration: number;
};

function isTrack(value: unknown): value is MusicTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<MusicTrack>;
  if (
    typeof track.id !== "string" || !track.id ||
    typeof track.title !== "string" ||
    typeof track.artist !== "string" ||
    typeof track.artwork !== "string" ||
    typeof track.durationMs !== "number" || !Number.isFinite(track.durationMs) ||
    !["youtube_music", "local"].includes(track.source ?? "")
  ) return false;
  if (track.source === "local") return typeof track.localUri === "string" && track.localUri.length > 0;
  return Boolean(track.youtubeVideoId || track.sourceTrackId || track.youtubeUrl);
}

export async function savePlaybackRecoverySnapshot(snapshot: Omit<PlaybackRecoverySnapshot, "version" | "savedAt">): Promise<void> {
  if (!isTrack(snapshot.currentTrack)) return;
  const queue = snapshot.queue.filter(isTrack).slice(0, 500);
  const safeSnapshot: PlaybackRecoverySnapshot = {
    version: 1,
    savedAt: Date.now(),
    currentTrack: snapshot.currentTrack,
    queue: queue.length ? queue : [snapshot.currentTrack],
    currentQueueIndex: Number.isInteger(snapshot.currentQueueIndex)
      ? Math.max(0, Math.min(queue.length - 1, snapshot.currentQueueIndex))
      : 0,
    playbackPosition: Number.isFinite(snapshot.playbackPosition) ? Math.max(0, snapshot.playbackPosition) : 0,
    playbackDuration: Number.isFinite(snapshot.playbackDuration) ? Math.max(0, snapshot.playbackDuration) : 0
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safeSnapshot));
  } catch {
    // Recovery is best-effort and must never interfere with active playback.
  }
}

export async function loadPlaybackRecoverySnapshot(): Promise<PlaybackRecoverySnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<PlaybackRecoverySnapshot>;
    if (
      value.version !== 1 ||
      typeof value.savedAt !== "number" ||
      !Number.isFinite(value.savedAt) ||
      Date.now() - value.savedAt > MAX_AGE_MS ||
      !isTrack(value.currentTrack)
    ) return null;
    const queue = Array.isArray(value.queue) ? value.queue.filter(isTrack).slice(0, 500) : [];
    const restoredQueue = queue.length ? queue : [value.currentTrack];
    const matchingIndex = restoredQueue.findIndex((track) => track.id === value.currentTrack?.id);
    return {
      version: 1,
      savedAt: value.savedAt,
      currentTrack: value.currentTrack,
      queue: restoredQueue,
      currentQueueIndex: matchingIndex >= 0 ? matchingIndex : 0,
      playbackPosition: Number.isFinite(value.playbackPosition) ? Math.max(0, value.playbackPosition as number) : 0,
      playbackDuration: Number.isFinite(value.playbackDuration) ? Math.max(0, value.playbackDuration as number) : 0
    };
  } catch {
    return null;
  }
}

export async function clearPlaybackRecoverySnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // A failed cleanup must not affect playback.
  }
}
