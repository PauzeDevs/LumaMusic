import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ProgressBarStyle = "apple" | "classic";

type PreferencesState = {
  progressBarStyle: ProgressBarStyle;
  setProgressBarStyle: (style: ProgressBarStyle) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      progressBarStyle: "apple",
      setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle })
    }),
    {
      name: "lumamusic-preferences",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ progressBarStyle: state.progressBarStyle })
    }
  )
);