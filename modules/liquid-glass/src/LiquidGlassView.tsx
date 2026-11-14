import { requireNativeViewManager } from "expo-modules-core";
import type { StyleProp, ViewProps, ViewStyle } from "react-native";
import { Platform, View } from "react-native";

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
  return <View style={style} pointerEvents="none" />;
}
