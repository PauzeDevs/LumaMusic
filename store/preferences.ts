import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
export type ProgressBarStyle = "apple" | "classic" | "waveform";
export type ReverbPreset = "off" | "room" | "studio" | "hall";
export type AccentTheme = "red" | "violet" | "blue" | "green" | "amber" | "rose" | "arctic" | "mono";
export type PlayerStyle = "standard" | "vinyl" | "poster";
export type SurfaceStyle = "liquid" | "frosted" | "clear" | "matte";
export type AppearanceMode = "system" | "light" | "dark";
export type MotionStyle = "full" | "subtle" | "off";
type PreferencesState = {
  progressBarStyle: ProgressBarStyle; spatialBalance: number; reverbPreset: ReverbPreset;
  accentTheme: AccentTheme; appearanceMode: AppearanceMode; motionStyle: MotionStyle; compactRows: boolean;
  playerStyle: PlayerStyle; surfaceStyle: SurfaceStyle; animationIntensity: number;
  setProgressBarStyle: (style: ProgressBarStyle) => void; setSpatialBalance: (balance: number) => void;
  setReverbPreset: (preset: ReverbPreset) => void; setAccentTheme: (theme: AccentTheme) => void;
  setAppearanceMode: (mode: AppearanceMode) => void; setMotionStyle: (style: MotionStyle) => void; setCompactRows: (compact: boolean) => void;
  setPlayerStyle: (style: PlayerStyle) => void; setSurfaceStyle: (style: SurfaceStyle) => void; setAnimationIntensity: (intensity: number) => void;
};
export const usePreferencesStore = create<PreferencesState>()(persist((set) => ({
  progressBarStyle: "apple", spatialBalance: 0, reverbPreset: "off",
  accentTheme: "red", appearanceMode: "system", motionStyle: "full", compactRows: false,
  playerStyle: "standard", surfaceStyle: "liquid", animationIntensity: 65,
  setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle }),
  setSpatialBalance: (spatialBalance) => set({ spatialBalance: Math.max(-1, Math.min(1, spatialBalance)) }),
  setReverbPreset: (reverbPreset) => set({ reverbPreset }),
  setAccentTheme: (accentTheme) => set({ accentTheme }),
  setAppearanceMode: (appearanceMode) => set({ appearanceMode }),
  setMotionStyle: (motionStyle) => set({ motionStyle }),
  setCompactRows: (compactRows) => set({ compactRows }),
  setPlayerStyle: (playerStyle) => set({ playerStyle }),
  setSurfaceStyle: (surfaceStyle) => set({ surfaceStyle }),
  setAnimationIntensity: (animationIntensity) => set({ animationIntensity: Math.max(0, Math.min(100, animationIntensity)) })
}), {
  name: "lumamusic-preferences", storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    progressBarStyle: state.progressBarStyle, spatialBalance: state.spatialBalance, reverbPreset: state.reverbPreset,
    accentTheme: state.accentTheme, appearanceMode: state.appearanceMode, motionStyle: state.motionStyle, compactRows: state.compactRows,
    playerStyle: state.playerStyle, surfaceStyle: state.surfaceStyle, animationIntensity: state.animationIntensity
  })
}));
