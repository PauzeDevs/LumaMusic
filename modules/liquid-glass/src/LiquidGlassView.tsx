import { requireNativeViewManager } from "expo-modules-core";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";
import { Platform, StyleSheet, View } from "react-native";

export type LiquidGlassViewProps = {
  style?: StyleProp<ViewStyle>;
  cornerRadius?: number;
  pointerEvents?: ViewProps["pointerEvents"];
};

// The native Liquid Glass view is iOS-only. Keep Android on the styled View
// fallback instead of resolving an unavailable native view manager at startup.
const NativeLiquidGlassView = Platform.OS === "ios"
  ? requireNativeViewManager<LiquidGlassViewProps>("LiquidGlass")
  : null;

export function LiquidGlassView({ style, cornerRadius = 24 }: LiquidGlassViewProps) {
  if (NativeLiquidGlassView) {
    return <NativeLiquidGlassView style={style} cornerRadius={cornerRadius} pointerEvents="none" />;
  }
  return <View style={[style, styles.androidGlass]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  androidGlass: {
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.055)",
    overflow: "hidden"
  }
});
