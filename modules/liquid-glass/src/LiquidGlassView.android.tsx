import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import type { LiquidGlassViewProps } from "./LiquidGlassView";
import { useTheme } from "../../../theme/useTheme";

/**
 * Android glass treatment.
 *
 * Dimezis BlurView captures and blurs the content behind this surface. The
 * layered highlights, tinted body and fine rim recreate the depth/reflections
 * of Liquid Glass without relying on iOS-only APIs.
 */
export function LiquidGlassView({ style, cornerRadius = 24 }: LiquidGlassViewProps) {
  const { blurTint, isDark } = useTheme();
  const radius = Math.max(0, cornerRadius);

  return (
    <View pointerEvents="none" style={[styles.clip, { borderRadius: radius }, style]}>
      <BlurView
        intensity={92}
        tint={blurTint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? "rgba(19,22,30,0.28)" : "rgba(238,245,255,0.22)" }
        ]}
      />
      <View
        style={[
          styles.upperGlow,
          { backgroundColor: isDark ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.46)" }
        ]}
      />
      <View
        style={[
          styles.lowerShade,
          { backgroundColor: isDark ? "rgba(0,0,0,0.16)" : "rgba(80,100,130,0.07)" }
        ]}
      />
      <View
        style={[
          styles.rim,
          {
            borderRadius: radius,
            borderColor: isDark ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.72)"
          }
        ]}
      />
      <View
        style={[
          styles.innerRim,
          {
            borderRadius: Math.max(0, radius - 1),
            borderColor: isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.34)"
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  upperGlow: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: "42%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  lowerShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "30%"
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1
  },
  innerRim: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: StyleSheet.hairlineWidth
  }
});
