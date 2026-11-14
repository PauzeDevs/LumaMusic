import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme/useTheme";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> };

/** Shared deep-matte surface used throughout the app for a consistent finish. */
export function GlassSurface({ children, style, contentStyle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.shell, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7
  },
  content: { flex: 1 }
});
