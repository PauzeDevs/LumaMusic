import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LiquidGlassView } from "../modules/liquid-glass/src";
import { useTheme } from "../theme/useTheme";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> };

/**
 * Shared surface treatment. Android's liquid finish is a lightweight layered
 * highlight/rim effect rather than a live backdrop blur; keep the content layer
 * separate so the decoration never intercepts touches or covers children.
 */
export function GlassSurface({ children, style, contentStyle }: Props) {
  const { colors, isDark, surfaceStyle } = useTheme();

  const backgroundColor = surfaceStyle === "matte"
    ? colors.surfaceElevated
    : surfaceStyle === "frosted"
      ? (isDark ? "rgba(31,33,40,0.88)" : "rgba(246,248,252,0.86)")
      : surfaceStyle === "clear"
        ? (isDark ? "rgba(24,27,34,0.48)" : "rgba(248,250,255,0.48)")
        : (isDark ? "rgba(20,23,31,0.58)" : "rgba(244,248,255,0.58)");

  const borderColor = surfaceStyle === "liquid"
    ? (isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.42)")
    : surfaceStyle === "clear"
      ? (isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.82)")
      : colors.border;

  return (
    <View style={[styles.shell, { borderColor, backgroundColor }, Platform.OS === "android" && styles.androidShell, style]}>
      {surfaceStyle === "liquid" ? (
        <LiquidGlassView cornerRadius={22} style={StyleSheet.absoluteFill} />
      ) : null}
      {surfaceStyle === "frosted" ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.frostedHighlight, { backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.32)" }]} />
      ) : null}
      {surfaceStyle === "clear" ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clearHighlight, { borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.68)" }]} />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0
  },
  androidShell: { shadowOpacity: 0, elevation: 0 },
  content: { flex: 1, zIndex: 1 },
  frostedHighlight: { opacity: 1 },
  clearHighlight: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 21 }
});
