import { requireNativeViewManager } from "expo-modules-core";
import type { StyleProp, ViewStyle } from "react-native";

export type LiquidGlassViewProps = {
  style?: StyleProp<ViewStyle>;
  cornerRadius?: number;
};

const NativeLiquidGlassView = requireNativeView<LiquidGlassViewProps>("LiquidGlass");

export function LiquidGlassView({ style, cornerRadius = 24 }: LiquidGlassViewProps) {
  return <NativeLiquidGlassView style={style} cornerRadius={cornerRadius} pointerEvents="none" />;
}
