import { create } from "zustand";
import type { MusicTrack } from "../types/music";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  currentTrack: MusicTrack | null;
  currentQueueIndex: number;
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
  setTrack: (track: MusicTrack, queue?: MusicTrack[], queueIndex?: number) => void;
  setPlaybackStatus: (status: { isPlaying: boolean; isBuffering: boolean; playbackPosition: number; playbackDuration: number; playbackError: string | null }) => void;
  setPlaybackError: (error: string | null) => void;
  setPlaybackRate: (rate: number) => void;
  setSleepTimerMinutes: (minutes: number | null) => void;
  removeFromQueue: (trackId: string) => void;
  removeQueueItemAt: (index: number) => void;
  moveQueueTrack: (from: number, to: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  currentQueueIndex: 0,
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
  setTrack: (track, queue, queueIndex) => {
    const nextQueue = queue && queue.length > 0 ? queue : [track];
    const resolvedIndex = queueIndex !== undefined && queueIndex >= 0 && queueIndex < nextQueue.length
      ? queueIndex
      : Math.max(0, nextQueue.findIndex((item) => item === track));
    return set({
      currentTrack: track,
      currentQueueIndex: resolvedIndex,
      queue: nextQueue,
      isPlaying: false,
      isBuffering: true,
      playbackPosition: 0,
      playbackDuration: track.durationMs / 1000,
      playbackError: null
    });
  },
  setPlaybackStatus: (status) => set(status),
  setPlaybackError: (error) => set({ playbackError: error, isBuffering: false, isPlaying: false }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setSleepTimerMinutes: (sleepTimerMinutes) => set({ sleepTimerMinutes }),
  removeFromQueue: (trackId) => set((state) => {
    const removedBeforeCurrent = state.queue.slice(0, state.currentQueueIndex)
      .filter((track) => track.id === trackId && track.id !== state.currentTrack?.id).length;
    const queue = state.queue.filter((track) => track.id !== trackId || track.id === state.currentTrack?.id);
    return {
      queue,
      currentQueueIndex: Math.max(0, Math.min(queue.length - 1, state.currentQueueIndex - removedBeforeCurrent))
    };
  }),
  removeQueueItemAt: (index) => set((state) => {
    if (index < 0 || index >= state.queue.length || index === state.currentQueueIndex) return state;
    return {
      queue: state.queue.filter((_, itemIndex) => itemIndex !== index),
      currentQueueIndex: index < state.currentQueueIndex ? state.currentQueueIndex - 1 : state.currentQueueIndex
    };
  }),
  moveQueueTrack: (from, to) => set((state) => {
    if (from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length || from === to) return state;
    const queue = [...state.queue];
    const [moved] = queue.splice(from, 1);
    queue.splice(to, 0, moved);
    let currentQueueIndex = state.currentQueueIndex;
    if (currentQueueIndex === from) currentQueueIndex = to;
    else if (from < currentQueueIndex && to >= currentQueueIndex) currentQueueIndex -= 1;
    else if (from > currentQueueIndex && to <= currentQueueIndex) currentQueueIndex += 1;
    return { queue, currentQueueIndex };
  }),
  clearQueue: () => set((state) => ({ queue: state.currentTrack ? [state.currentTrack] : [], currentQueueIndex: 0 })),
  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  cycleRepeat: () => set((state) => ({
    repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off"
  }))
}));
