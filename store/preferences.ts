import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export type ProgressBarStyle = "apple" | "classic";
export type ReverbPreset = "off" | "room" | "studio" | "hall";
export type AccentTheme = "red" | "violet" | "blue" | "green";
export type MotionStyle = "full" | "subtle" | "off";
type PreferencesState = {
  progressBarStyle: ProgressBarStyle; spatialBalance: number; reverbPreset: ReverbPreset;
  accentTheme: AccentTheme; motionStyle: MotionStyle; compactRows: boolean;
  setProgressBarStyle: (style: ProgressBarStyle) => void; setSpatialBalance: (balance: number) => void;
  setReverbPreset: (preset: ReverbPreset) => void; setAccentTheme: (theme: AccentTheme) => void;
  setMotionStyle: (style: MotionStyle) => void; setCompactRows: (compact: boolean) => void;
};
export const usePreferencesStore = create<PreferencesState>()(persist((set) => ({
  progressBarStyle: "apple", spatialBalance: 0, reverbPreset: "off",
  accentTheme: "red", motionStyle: "full", compactRows: false,
  setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle }),
  setSpatialBalance: (spatialBalance) => set({ spatialBalance: Math.max(-1, Math.min(1, spatialBalance)) }),
  setReverbPreset: (reverbPreset) => set({ reverbPreset }),
  setAccentTheme: (accentTheme) => set({ accentTheme }),
  setMotionStyle: (motionStyle) => set({ motionStyle }),
  setCompactRows: (compactRows) => set({ compactRows })
}), {
  name: "lumamusic-preferences", storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    progressBarStyle: state.progressBarStyle, spatialBalance: state.spatialBalance, reverbPreset: state.reverbPreset,
    accentTheme: state.accentTheme, motionStyle: state.motionStyle, compactRows: state.compactRows
  })
}));
