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
export type LyricsProviderPreference = "auto" | "lrclib" | "lyrics-ovh";
export type EqualizerBand = number;
export type PreferencesState = {
  progressBarStyle: ProgressBarStyle; spatialBalance: number; reverbPreset: ReverbPreset; equalizerEnabled: boolean; equalizerBands: EqualizerBand[]; preampDb: number; limiterEnabled: boolean;
  accentTheme: AccentTheme; appearanceMode: AppearanceMode; motionStyle: MotionStyle; compactRows: boolean;
  playerStyle: PlayerStyle; surfaceStyle: SurfaceStyle; animationIntensity: number;
  autoCrossfadeEnabled: boolean; crossfadeDurationSeconds: number; lyricsProvider: LyricsProviderPreference; lyricsSyncOffsetMs: number;
  setProgressBarStyle: (style: ProgressBarStyle) => void; setSpatialBalance: (balance: number) => void;
  setEqualizerEnabled: (enabled: boolean) => void; setEqualizerBand: (index: number, gain: number) => void; resetEqualizer: () => void; setPreampDb: (gain: number) => void; setLimiterEnabled: (enabled: boolean) => void;
  setReverbPreset: (preset: ReverbPreset) => void; setAccentTheme: (theme: AccentTheme) => void;
  setAppearanceMode: (mode: AppearanceMode) => void; setMotionStyle: (style: MotionStyle) => void; setCompactRows: (compact: boolean) => void;
  setPlayerStyle: (style: PlayerStyle) => void; setSurfaceStyle: (style: SurfaceStyle) => void; setAnimationIntensity: (intensity: number) => void;
  setAutoCrossfadeEnabled: (enabled: boolean) => void; setCrossfadeDurationSeconds: (seconds: number) => void; setLyricsProvider: (provider: LyricsProviderPreference) => void; setLyricsSyncOffsetMs: (offsetMs: number) => void;
};

export type PreferencesSnapshot = Pick<PreferencesState,
  | "progressBarStyle" | "spatialBalance" | "reverbPreset" | "equalizerEnabled" | "equalizerBands" | "preampDb" | "limiterEnabled"
  | "accentTheme" | "appearanceMode" | "motionStyle" | "compactRows"
  | "playerStyle" | "surfaceStyle" | "animationIntensity" | "autoCrossfadeEnabled" | "crossfadeDurationSeconds" | "lyricsProvider" | "lyricsSyncOffsetMs"
>;
export const usePreferencesStore = create<PreferencesState>()(persist((set) => ({
  progressBarStyle: "apple", spatialBalance: 0, reverbPreset: "off", equalizerEnabled: false, equalizerBands: [0, 0, 0, 0, 0], preampDb: 0, limiterEnabled: false,
  accentTheme: "red", appearanceMode: "dark", motionStyle: "full", compactRows: false,
  playerStyle: "standard", surfaceStyle: "matte", animationIntensity: 65,
  autoCrossfadeEnabled: false, crossfadeDurationSeconds: 5, lyricsProvider: "auto", lyricsSyncOffsetMs: 0,
  setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle }),
  setSpatialBalance: (spatialBalance) => set({ spatialBalance: Math.max(-1, Math.min(1, spatialBalance)) }),
  setReverbPreset: (reverbPreset) => set({ reverbPreset }),
  setEqualizerEnabled: (equalizerEnabled) => set({ equalizerEnabled }),
  setEqualizerBand: (index, gain) => set((state) => ({ equalizerBands: state.equalizerBands.map((value, band) => band === index ? Math.max(-12, Math.min(12, gain)) : value) })),
  resetEqualizer: () => set({ equalizerBands: [0, 0, 0, 0, 0] }),
  setPreampDb: (preampDb) => { if (Number.isFinite(preampDb)) set({ preampDb: Math.max(-12, Math.min(6, preampDb)) }); },
  setLimiterEnabled: (limiterEnabled) => set({ limiterEnabled }),
  setAccentTheme: (accentTheme) => set({ accentTheme }),
  setAppearanceMode: (appearanceMode) => set({ appearanceMode }),
  setMotionStyle: (motionStyle) => set({ motionStyle }),
  setCompactRows: (compactRows) => set({ compactRows }),
  setPlayerStyle: (playerStyle) => set({ playerStyle }),
  setSurfaceStyle: (surfaceStyle) => set({ surfaceStyle }),
  setAnimationIntensity: (animationIntensity) => set({ animationIntensity: Math.max(0, Math.min(100, animationIntensity)) }),
  setAutoCrossfadeEnabled: (autoCrossfadeEnabled) => set({ autoCrossfadeEnabled }),
  setCrossfadeDurationSeconds: (crossfadeDurationSeconds) => {
    if (Number.isFinite(crossfadeDurationSeconds)) set({ crossfadeDurationSeconds: Math.max(1, Math.min(12, crossfadeDurationSeconds)) });
  },
  setLyricsProvider: (lyricsProvider) => set({ lyricsProvider }),
  setLyricsSyncOffsetMs: (lyricsSyncOffsetMs) => {
    if (Number.isFinite(lyricsSyncOffsetMs)) set({ lyricsSyncOffsetMs: Math.max(-10_000, Math.min(10_000, Math.round(lyricsSyncOffsetMs / 250) * 250)) });
  }
}), {
  name: "lumamusic-preferences", storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    progressBarStyle: state.progressBarStyle, spatialBalance: state.spatialBalance, reverbPreset: state.reverbPreset,
    equalizerEnabled: state.equalizerEnabled, equalizerBands: state.equalizerBands, preampDb: state.preampDb, limiterEnabled: state.limiterEnabled,
    accentTheme: state.accentTheme, appearanceMode: state.appearanceMode, motionStyle: state.motionStyle, compactRows: state.compactRows,
    playerStyle: state.playerStyle, surfaceStyle: state.surfaceStyle, animationIntensity: state.animationIntensity,
    autoCrossfadeEnabled: state.autoCrossfadeEnabled, crossfadeDurationSeconds: state.crossfadeDurationSeconds, lyricsProvider: state.lyricsProvider, lyricsSyncOffsetMs: state.lyricsSyncOffsetMs
  })
}));
