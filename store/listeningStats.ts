import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicTrack } from "../types/music";

export type ListeningTrackStat = { id: string; title: string; artist: string; artwork: string; genre: string; album: string; seconds: number; plays: number };
export type ListeningDay = { seconds: number; plays: number; tracks: Record<string, ListeningTrackStat> };
type StatsState = {
  days: Record<string, ListeningDay>;
  beginTrack: () => void;
  recordProgress: (track: MusicTrack, position: number, playing: boolean) => void;
  clearStats: () => void;
};
let lastSample: { id: string; position: number } | null = null;
let pendingSeconds = 0;
let pendingTrack: MusicTrack | null = null;
let activeSessionTrackId: string | null = null;
const dateKey = (date = new Date()) => {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
};
function trackMeta(track: MusicTrack): ListeningTrackStat {
  const extended = track as MusicTrack & { album?: string; albumTitle?: string };
  return { id: track.id, title: track.title, artist: track.artist, artwork: track.artwork, genre: track.genre?.trim() || "", album: extended.albumTitle || extended.album || "", seconds: 0, plays: 0 };
}
function flushPending(set: (fn: (state: StatsState) => Partial<StatsState>) => void) {
  if (!pendingTrack || pendingSeconds <= 0) return;
  const track = pendingTrack, seconds = pendingSeconds, key = dateKey();
  pendingTrack = null; pendingSeconds = 0;
  set((state) => {
    const day = state.days[key] ?? { seconds: 0, plays: 0, tracks: {} };
    const existing = day.tracks[track.id] ?? trackMeta(track);
    return { days: { ...state.days, [key]: { ...day, seconds: day.seconds + seconds, tracks: { ...day.tracks, [track.id]: { ...existing, seconds: existing.seconds + seconds } } } } };
  });
}
export const useListeningStatsStore = create<StatsState>()(persist((set) => ({
  days: {},
  beginTrack: () => { flushPending(set); lastSample = null; activeSessionTrackId = null; },
  recordProgress: (track, position, playing) => {
    if (!playing || !Number.isFinite(position)) {
      flushPending(set); lastSample = null; return;
    }
    if (activeSessionTrackId !== track.id) {
      activeSessionTrackId = track.id;
      const key = dateKey();
      set((state) => {
        const day = state.days[key] ?? { seconds: 0, plays: 0, tracks: {} };
        const existing = day.tracks[track.id] ?? trackMeta(track);
        return { days: { ...state.days, [key]: { ...day, plays: day.plays + 1, tracks: { ...day.tracks, [track.id]: { ...existing, plays: existing.plays + 1 } } } } };
      });
    }
    if (lastSample?.id === track.id) {
      const delta = position - lastSample.position;
      if (delta > 0 && delta <= 2.5) {
        pendingSeconds += delta;
        pendingTrack = track;
        if (pendingSeconds >= 2) flushPending(set);
      }
    }
    lastSample = { id: track.id, position };
  },
  clearStats: () => { lastSample = null; pendingSeconds = 0; pendingTrack = null; activeSessionTrackId = null; set({ days: {} }); }
}), {
  name: "lumamusic-listening-stats-v1",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ days: state.days })
}));
