export type ThemePalette = {
  background: string; surface: string; surfaceElevated: string; surfaceSoft: string;
  border: string; text: string; muted: string; subtle: string; accent: string;
  accentStrong: string; mint: string; pink: string; orange: string; danger: string;
};

export const darkColors: ThemePalette = {
  background: "#080809", surface: "#121214", surfaceElevated: "#1B1B1F",
  surfaceSoft: "#242428", border: "rgba(255,255,255,0.09)", text: "#F5F5F7",
  muted: "#A1A1AA", subtle: "#73737C", accent: "#F04455", accentStrong: "#D92D43",
  mint: "#B9C5C0", pink: "#D8A2AA", orange: "#D6B58A", danger: "#FF453A"
};

export const lightColors: ThemePalette = {
  background: "#F4F4F6", surface: "#FFFFFF", surfaceElevated: "#FFFFFF",
  surfaceSoft: "#EBEBEF", border: "rgba(20,20,24,0.09)", text: "#19191D",
  muted: "#686870", subtle: "#92929A", accent: "#E9364D", accentStrong: "#C9253B",
  mint: "#438C79", pink: "#E38AA0", orange: "#B87A35", danger: "#D70015"
};

export const colors = darkColors;
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
