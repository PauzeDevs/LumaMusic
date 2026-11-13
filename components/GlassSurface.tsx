import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassSurface({ children, style, contentStyle, intensity = 72 }: Props) {
  return (
    <View style={[styles.shell, style]}>
      <BlurView tint="dark" intensity={intensity} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.tint} />
      <View pointerEvents="none" style={styles.topSheen} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.23)",
    backgroundColor: "rgba(47,27,43,0.38)"
  },
  tint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,190,214,0.045)"
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.34)"
  },
  content: { flex: 1 }
});