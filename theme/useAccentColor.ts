import { usePreferencesStore } from "../store/preferences";

const accentColors = {
  red: "#F05A68",
  violet: "#B69BFF",
  blue: "#72B7F4",
  green: "#8DD6B5"
} as const;

export function useAccentColor() {
  const theme = usePreferencesStore((state) => state.accentTheme);
  return accentColors[theme];
}
