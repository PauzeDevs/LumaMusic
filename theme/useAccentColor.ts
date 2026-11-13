import { usePreferencesStore } from "../store/preferences";

const accentColors = {
  red: "#FA2D48",
  violet: "#B69BFF",
  blue: "#72B7F4",
  green: "#35B88A",
  amber: "#E7A84B",
  rose: "#F080A8",
  arctic: "#8BD9E8",
  mono: "#D5D5D5"
} as const;

export function useAccentColor() {
  const theme = usePreferencesStore((state) => state.accentTheme);
  return accentColors[theme];
}
