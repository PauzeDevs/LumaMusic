import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassSurface({ children, style, contentStyle, intensity = 48 }: Props) {
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
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(25,27,34,0.58)"
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.025)"
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  content: { flex: 1 }
});