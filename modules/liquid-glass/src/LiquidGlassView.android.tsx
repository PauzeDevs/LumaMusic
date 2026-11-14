import { BlurView } from "expo-blur";
import type { LiquidGlassViewProps } from "./LiquidGlassView";

export function LiquidGlassView({ style }: LiquidGlassViewProps) {
  return <BlurView intensity={88} tint="dark" style={style} />;
}
