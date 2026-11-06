import { create } from "zustand";
import { mockTracks } from "../data/mockTracks";
import type { MusicTrack } from "../types/music";

type PlayerState = {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  queue: MusicTrack[];
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  togglePlayback: () => void;
  playNext: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: mockTracks[0],
  isPlaying: false,
  queue: mockTracks,
  setTrack: (track, queue) =>
    set({
      currentTrack: track,
      isPlaying: true,
      queue: queue && queue.length > 0 ? queue : [track]
    }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  playNext: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const nextTrack = queue[(currentIndex + 1) % queue.length];
    set({ currentTrack: nextTrack, isPlaying: true });
  }
}));