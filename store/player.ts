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
  playbackRate: number;
  sleepTimerMinutes: number | null;
  queue: MusicTrack[];
  isShuffled: boolean;
  repeatMode: RepeatMode;
  setTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  setPlaybackStatus: (status: { isPlaying: boolean; isBuffering: boolean; playbackPosition: number; playbackDuration: number; playbackError: string | null }) => void;
  setPlaybackError: (error: string | null) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimerMinutes: (minutes: number | null) => void;
  removeFromQueue: (trackId: string) => void;
  moveQueueTrack: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  playbackPosition: 0,
  playbackDuration: 0,
  playbackError: null,
  playbackRate: 1,
  sleepTimerMinutes: null,
  queue: [],
  isShuffled: false,
  repeatMode: "off",
  setTrack: (track, queue) =>
    set({
      currentTrack: track,
      queue: queue && queue.length > 0 ? queue : [track],
      isPlaying: false,
      isBuffering: true,
      playbackPosition: 0,
      playbackDuration: track.durationMs / 1000,
      playbackError: null
    }),
  setPlaybackStatus: (status) => set(status),
  setPlaybackError: (error) => set({ playbackError: error, isBuffering: false, isPlaying: false }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setSleepTimerMinutes: (sleepTimerMinutes) => set({ sleepTimerMinutes }),
  removeFromQueue: (trackId) => set((state) => ({ queue: state.queue.filter((track) => track.id !== trackId || track.id === state.currentTrack?.id) })),
  moveQueueTrack: (from, to) => set((state) => {
    if (from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length || from === to) return state;
    const queue = [...state.queue];
    const [moved] = queue.splice(from, 1);
    queue.splice(to, 0, moved);
    return { queue };
  }),
  clearQueue: () => set((state) => ({ queue: state.currentTrack ? [state.currentTrack] : [] })),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => ({
    repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off"
  }))
}));
