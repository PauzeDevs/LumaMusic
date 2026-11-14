import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LiquidGlassView } from "../modules/liquid-glass/src";
import { useTheme } from "../theme/useTheme";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> };
export function GlassSurface({ children, style, contentStyle }: Props) {
  const { colors, isDark } = useTheme();
  return <View style={[styles.shell, { borderColor: colors.border, backgroundColor: isDark ? "rgba(38,38,42,0.20)" : "rgba(255,255,255,0.20)" }, style]}>
    <LiquidGlassView cornerRadius={24} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.tint, { backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.22)" }]} />
    <View pointerEvents="none" style={[styles.topSheen, { backgroundColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.8)" }]} />
    <View style={[styles.content, contentStyle]}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({ shell: { overflow: "hidden", borderWidth: 1 }, tint: { ...StyleSheet.absoluteFill }, topSheen: { position: "absolute", top: 0, left: 12, right: 12, height: 1 }, content: { flex: 1 } });
