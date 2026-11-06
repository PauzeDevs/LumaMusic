import { create } from "zustand";
import { mockTracks } from "../data/mockTracks";
import type { MusicTrack } from "../types/music";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  queue: MusicTrack[];
  isShuffled: boolean;
  repeatMode: RepeatMode;
  likedTrackIds: string[];
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (trackId: string) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: mockTracks[0],
  isPlaying: false,
  queue: mockTracks,
  isShuffled: false,
  repeatMode: "off",
  likedTrackIds: [mockTracks[0].id],
  setTrack: (track, queue) =>
    set({
      currentTrack: track,
      isPlaying: true,
      queue: queue && queue.length > 0 ? queue : [track]
    }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  playNext: () => {
    const { queue, currentTrack, repeatMode } = get();
    if (queue.length === 0) return;
    if (repeatMode === "one" && currentTrack) {
      set({ isPlaying: true });
      return;
    }
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length && repeatMode === "off") {
      set({ isPlaying: false });
      return;
    }
    set({ currentTrack: queue[nextIndex % queue.length], isPlaying: true });
  },
  playPrevious: () => {
    const { queue, currentTrack } = get();
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const previousIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    set({ currentTrack: queue[previousIndex], isPlaying: true });
  },
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