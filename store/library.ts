import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicTrack } from "../types/music";

type LibraryState = {
  likedTracks: MusicTrack[];
  recentTracks: MusicTrack[];
  toggleLike: (track: MusicTrack) => void;
  addRecentTrack: (track: MusicTrack) => void;
};

type PersistedLibraryState = Pick<LibraryState, "likedTracks" | "recentTracks">;

export const useLibraryStore = create<LibraryState>()(
  persist<LibraryState, [], [], PersistedLibraryState>(
    (set) => ({
      likedTracks: [],
      recentTracks: [],
      toggleLike: (track) => set((state) => ({
        likedTracks: state.likedTracks.some((item) => item.id === track.id)
          ? state.likedTracks.filter((item) => item.id !== track.id)
          : [...state.likedTracks, track]
      })),
      addRecentTrack: (track) => set((state) => ({
        recentTracks: [track, ...state.recentTracks.filter((item) => item.id !== track.id)].slice(0, 30)
      }))
    }),
    {
      name: "lumamusic-library",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        likedTracks: state.likedTracks,
        recentTracks: state.recentTracks
      })
    }
  )
);
