export type ThemePalette = {
  background: string; surface: string; surfaceElevated: string; surfaceSoft: string;
  border: string; text: string; muted: string; subtle: string; accent: string;
  accentStrong: string; mint: string; pink: string; orange: string; danger: string;
};

export const darkColors: ThemePalette = {
  background: "#09090A", surface: "#171719", surfaceElevated: "#202023",
  surfaceSoft: "#29292D", border: "rgba(255,255,255,0.10)", text: "#F7F7F8",
  muted: "#A2A2A8", subtle: "#77777F", accent: "#F04455", accentStrong: "#D92D43",
  mint: "#B7B7BE", pink: "#D8A2AA", orange: "#D6B58A", danger: "#FF453A"
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
