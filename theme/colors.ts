export type ThemePalette = {
  background: string; surface: string; surfaceElevated: string; surfaceSoft: string;
  border: string; text: string; muted: string; subtle: string; accent: string;
  accentStrong: string; mint: string; pink: string; orange: string; danger: string;
};

export const darkColors: ThemePalette = {
  background: "#000000", surface: "#1C1C1E", surfaceElevated: "#2C2C2E",
  surfaceSoft: "#3A3A3C", border: "rgba(255,255,255,0.12)", text: "#F5F5F7",
  muted: "#A1A1A6", subtle: "#77777D", accent: "#FA2D48", accentStrong: "#D91532",
  mint: "#FF8FA3", pink: "#F5A1B8", orange: "#FFB36B", danger: "#FF453A"
};

export const lightColors: ThemePalette = {
  background: "#F5F5F7", surface: "#FFFFFF", surfaceElevated: "#FFFFFF",
  surfaceSoft: "#F0F0F2", border: "rgba(0,0,0,0.08)", text: "#1D1D1F",
  muted: "#6E6E73", subtle: "#8E8E93", accent: "#FA2D48", accentStrong: "#D91532",
  mint: "#FF8FA3", pink: "#F5A1B8", orange: "#FFB36B", danger: "#D70015"
};

// Backwards-compatible default palette for components not yet migrated to useTheme.
export const colors = darkColors;
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
