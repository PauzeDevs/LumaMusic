import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export type ProgressBarStyle = "apple" | "classic";
export type ReverbPreset = "off" | "room" | "studio" | "hall";
type PreferencesState = {
  progressBarStyle: ProgressBarStyle; spatialBalance: number; reverbPreset: ReverbPreset;
  setProgressBarStyle: (style: ProgressBarStyle) => void;
  setSpatialBalance: (balance: number) => void;
  setReverbPreset: (preset: ReverbPreset) => void;
};
export const usePreferencesStore = create<PreferencesState>()(
  persist((set) => ({
    progressBarStyle: "apple", spatialBalance: 0, reverbPreset: "off",
    setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle }),
    setSpatialBalance: (spatialBalance) => set({ spatialBalance: Math.max(-1, Math.min(1, spatialBalance)) }),
    setReverbPreset: (reverbPreset) => set({ reverbPreset })
  }), {
    name: "lumamusic-preferences", storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      progressBarStyle: state.progressBarStyle, spatialBalance: state.spatialBalance, reverbPreset: state.reverbPreset
    })
  })
);
