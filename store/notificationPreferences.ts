import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type NotificationPreferencesState = {
  newMusic: boolean;
  artistReleases: boolean;
  appAnnouncements: boolean;
  setNewMusic: (enabled: boolean) => void;
  setArtistReleases: (enabled: boolean) => void;
  setAppAnnouncements: (enabled: boolean) => void;
};

export const useNotificationPreferences = create<NotificationPreferencesState>()(
  persist((set) => ({
    newMusic: true,
    artistReleases: true,
    appAnnouncements: true,
    setNewMusic: (newMusic) => set({ newMusic }),
    setArtistReleases: (artistReleases) => set({ artistReleases }),
    setAppAnnouncements: (appAnnouncements) => set({ appAnnouncements })
  }), {
    name: "lumamusic-notification-preferences",
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      newMusic: state.newMusic,
      artistReleases: state.artistReleases,
      appAnnouncements: state.appAnnouncements
    })
  })
);
