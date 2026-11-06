import { create } from "zustand";
import type { MusicTrack } from "../types/music";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackPosition: number;
  playbackDuration: number;
  playbackError: string | null;
  queue: MusicTrack[];
  isShuffled: boolean;
  repeatMode: RepeatMode;
  likedTrackIds: string[];
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  setPlaybackStatus: (status: { isPlaying: boolean; isBuffering: boolean; playbackPosition: number; playbackDuration: number; playbackError: string | null }) => void;
  setPlaybackError: (error: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (trackId: string) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  playbackPosition: 0,
  playbackDuration: 0,
  playbackError: null,
  queue: [],
  isShuffled: false,
  repeatMode: "off",
  likedTrackIds: [],
  setTrack: (track, queue) =>
    set((state) => ({
      currentTrack: track,
      queue: queue && queue.length > 0 ? queue : [track],
      isPlaying: false,
      isBuffering: true,
      playbackPosition: 0,
      playbackDuration: track.durationMs / 1000,
      playbackError: null,
      likedTrackIds: state.likedTrackIds
    })),
  setPlaybackStatus: (status) => set(status),
  setPlaybackError: (error) => set({ playbackError: error, isBuffering: false }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => ({
    repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off"
  })),
  toggleLike: (trackId) => set((state) => ({
    likedTrackIds: state.likedTrackIds.includes(trackId)
      ? state.likedTrackIds.filter((id) => id !== trackId)
      : [...state.likedTrackIds, trackId]
  }))
}));