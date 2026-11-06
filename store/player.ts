import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
  recentTracks: MusicTrack[];
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  setPlaybackStatus: (status: { isPlaying: boolean; isBuffering: boolean; playbackPosition: number; playbackDuration: number; playbackError: string | null }) => void;
  setPlaybackError: (error: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (track: MusicTrack) => void;
};

type PersistedPlayerState = Pick<PlayerState, "likedTracks" | "recentTracks" | "isShuffled" | "repeatMode">;

export const usePlayerStore = create<PlayerState>()(
  persist<PlayerState, [], [], PersistedPlayerState>(
    (set) => ({
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
      recentTracks: [],
      setTrack: (track, queue) =>
        set((state) => ({
          currentTrack: track,
          queue: queue && queue.length > 0 ? queue : [track],
          isPlaying: false,
          isBuffering: true,
          playbackPosition: 0,
          playbackDuration: track.durationMs / 1000,
          playbackError: null,
          recentTracks: [track, ...state.recentTracks.filter((item) => item.id !== track.id)].slice(0, 30)
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
    }),
    {
      name: "lumamusic-library",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        likedTracks: state.likedTracks,
        recentTracks: state.recentTracks,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode
      })
    }
  )
);
