import { useColorScheme } from "react-native";
import { usePreferencesStore } from "../store/preferences";
import { darkColors, lightColors } from "./colors";

const accents = { red: "#F04455", violet: "#B69BFF", blue: "#72B7F4", green: "#35B88A", amber: "#E7A84B", rose: "#F080A8", arctic: "#8BD9E8", mono: "#D5D5D5" } as const;

export function useTheme() {
  const systemScheme = useColorScheme();
  const appearanceMode = usePreferencesStore((state) => state.appearanceMode);
  const accentTheme = usePreferencesStore((state) => state.accentTheme);
  const surfaceStyle = usePreferencesStore((state) => state.surfaceStyle);
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const mode = appearanceMode === "system" ? (systemScheme === "light" ? "light" : "dark") : appearanceMode;
  const base = mode === "light" ? lightColors : darkColors;
  const accent = accents[accentTheme];
  return {
    mode, isDark: mode === "dark", surfaceStyle, motionStyle,
    colors: { ...base, accent, accentStrong: accentTheme === "red" ? "#D92D43" : accent },
    blurTint: mode === "dark" ? "dark" as const : "light" as const
  };
}
