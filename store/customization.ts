import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccentTheme, PlayerStyle, SurfaceStyle } from "./preferences";

export type CustomLook = { id: string; name: string; accent: AccentTheme; surface: SurfaceStyle; playerStyle?: PlayerStyle };
type CustomizationState = {
  installedModules: string[];
  customLooks: CustomLook[];
  installModule: (id: string) => void;
  removeModule: (id: string) => void;
  moveModule: (id: string, direction: -1 | 1) => void;
  saveLook: (look: CustomLook) => void;
  deleteLook: (id: string) => void;
};
export const useCustomizationStore = create<CustomizationState>()(persist((set) => ({
  installedModules: ["youtube-music", "local-library"],
  customLooks: [],
  installModule: (id) => set((state) => ({ installedModules: state.installedModules.includes(id) ? state.installedModules : [...state.installedModules, id] })),
  removeModule: (id) => set((state) => ({ installedModules: state.installedModules.filter((item) => item !== id) })),
  moveModule: (id, direction) => set((state) => {
    const items = [...state.installedModules];
    const index = items.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= items.length) return state;
    [items[index], items[next]] = [items[next], items[index]];
    return { installedModules: items };
  }),
  saveLook: (look) => set((state) => ({ customLooks: [...state.customLooks.filter((item) => item.id !== look.id), look] })),
  deleteLook: (id) => set((state) => ({ customLooks: state.customLooks.filter((item) => item.id !== id) }))
}), { name: "lumamusic-customization", storage: createJSONStorage(() => AsyncStorage) }));
