import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AccentTheme, PlayerStyle, SurfaceStyle } from "./preferences";
import type { ModuleManifest, ModulePermission } from "../services/moduleManifest";

export type CustomLook = { id: string; name: string; accent: AccentTheme; surface: SurfaceStyle; playerStyle?: PlayerStyle };
export type UserModule = { id: string; name: string; detail: string; createdAt: number };
export type InstalledExtension = { manifest: ModuleManifest; approvedPermissions: ModulePermission[]; installedAt: number };
type CustomizationState = {
  installedModules: string[];
  customLooks: CustomLook[];
  userModules: UserModule[];
  extensions: InstalledExtension[];
  installModule: (id: string) => void;
  removeModule: (id: string) => void;
  moveModule: (id: string, direction: -1 | 1) => void;
  installExtension: (manifest: ModuleManifest, approvedPermissions: ModulePermission[]) => void;
  updateExtensionPermissions: (id: string, permissions: ModulePermission[]) => void;
  removeExtension: (id: string) => void;
  saveLook: (look: CustomLook) => void;
  deleteLook: (id: string) => void;
  createUserModule: (module: UserModule) => void;
  deleteUserModule: (id: string) => void;
};
export const useCustomizationStore = create<CustomizationState>()(persist((set) => ({
  installedModules: ["youtube-music", "local-library"],
  customLooks: [],
  userModules: [],
  extensions: [],
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
  installExtension: (manifest, approvedPermissions) => set((state) => {
    const existing = state.extensions.filter((entry) => entry.manifest.id !== manifest.id);
    return { extensions: [...existing, { manifest, approvedPermissions: approvedPermissions.filter((permission) => manifest.permissions.includes(permission)), installedAt: Date.now() }] };
  }),
  updateExtensionPermissions: (id, permissions) => set((state) => ({
    extensions: state.extensions.map((entry) => entry.manifest.id === id
      ? { ...entry, approvedPermissions: permissions.filter((permission) => entry.manifest.permissions.includes(permission)) }
      : entry)
  })),
  removeExtension: (id) => set((state) => ({ extensions: state.extensions.filter((entry) => entry.manifest.id !== id) })),
  saveLook: (look) => set((state) => ({ customLooks: [...state.customLooks.filter((item) => item.id !== look.id), look] })),
  deleteLook: (id) => set((state) => ({ customLooks: state.customLooks.filter((item) => item.id !== id) })),
  createUserModule: (module) => set((state) => ({ userModules: [...state.userModules, module], installedModules: [...state.installedModules, module.id] })),
  deleteUserModule: (id) => set((state) => ({ userModules: state.userModules.filter((item) => item.id !== id), installedModules: state.installedModules.filter((item) => item !== id) }))
}), { name: "lumamusic-customization", storage: createJSONStorage(() => AsyncStorage) }));
