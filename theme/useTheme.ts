import { useColorScheme } from "react-native";
import { usePreferencesStore } from "../store/preferences";
import { darkColors, lightColors } from "./colors";

export function useTheme() {
  const systemScheme = useColorScheme();
  const appearanceMode = usePreferencesStore((state) => state.appearanceMode);
  const accentTheme = usePreferencesStore((state) => state.accentTheme);
  const mode = appearanceMode === "system" ? (systemScheme === "light" ? "light" : "dark") : appearanceMode;
  const base = mode === "light" ? lightColors : darkColors;
  const accents = { red: "#FA2D48", violet: "#B69BFF", blue: "#72B7F4", green: "#8DD6B5" } as const;
  const accent = accents[accentTheme];
  return { mode, isDark: mode === "dark", colors: { ...base, accent, accentStrong: accentTheme === "red" ? "#D91532" : accent }, blurTint: mode === "dark" ? "dark" as const : "light" as const };
}
