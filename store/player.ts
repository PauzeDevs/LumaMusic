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
  likedTracks: MusicTrack[];
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  setPlaybackStatus: (status: { isPlaying: boolean; isBuffering: boolean; playbackPosition: number; playbackDuration: number; playbackError: string | null }) => void;
  setPlaybackError: (error: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (track: MusicTrack) => void;
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
  likedTracks: [],
  setTrack: (track, queue) =>
    set((state) => ({
      currentTrack: track,
      queue: queue && queue.length > 0 ? queue : [track],
      isPlaying: false,
      isBuffering: true,
      playbackPosition: 0,
      playbackDuration: track.durationMs / 1000,
      playbackError: null,
      likedTracks: state.likedTracks
    })),
  setPlaybackStatus: (status) => set(status),
  setPlaybackError: (error) => set({ playbackError: error, isBuffering: false, isPlaying: false }),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => ({
    repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off"
  })),
  toggleLike: (track) => set((state) => ({
    likedTracks: state.likedTracks.some((item) => item.id === track.id)
      ? state.likedTracks.filter((item) => item.id !== track.id)
      : [...state.likedTracks, track]
  }))
}));