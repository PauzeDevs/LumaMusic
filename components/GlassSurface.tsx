import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LiquidGlassView } from "../modules/liquid-glass/src";
import { useTheme } from "../theme/useTheme";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> };
export function GlassSurface({ children, style, contentStyle }: Props) {
  const { colors, isDark, surfaceStyle } = useTheme();
  const liquid = surfaceStyle === "liquid";
  const frosted = surfaceStyle === "frosted";
  const clear = surfaceStyle === "clear";
  const fill = surfaceStyle === "matte"
    ? colors.surfaceElevated
    : isDark
      ? liquid ? "rgba(31,31,36,0.62)" : frosted ? "rgba(28,28,33,0.78)" : "rgba(25,25,30,0.30)"
      : liquid ? "rgba(255,255,255,0.66)" : frosted ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.42)";
  return <View style={[styles.shell, { borderColor: colors.border, backgroundColor: fill }, style]}>
    {liquid || frosted ? <LiquidGlassView cornerRadius={24} style={[StyleSheet.absoluteFill, { opacity: liquid ? 0.8 : 0.45 }]} /> : null}
    {liquid ? <View pointerEvents="none" style={[styles.tint, { backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.20)" }]} /> : null}
    {liquid ? <View pointerEvents="none" style={[styles.topSheen, { backgroundColor: isDark ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.86)" }]} /> : null}
    <View style={[styles.content, contentStyle]}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { overflow: "hidden", borderWidth: 1, borderRadius: 22, shadowColor: "#000000", shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 5 },
  tint: { ...StyleSheet.absoluteFill },
  topSheen: { position: "absolute", top: 0, left: 14, right: 14, height: 1 },
  content: { flex: 1 }
});
