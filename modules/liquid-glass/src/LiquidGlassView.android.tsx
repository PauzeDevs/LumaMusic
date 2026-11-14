import { BlurView } from "expo-blur";
import type { LiquidGlassViewProps } from "./LiquidGlassView";
import { useTheme } from "../../../theme/useTheme";

export function LiquidGlassView({ style }: LiquidGlassViewProps) {
  const { blurTint } = useTheme();
  return <BlurView intensity={88} tint={blurTint} style={style} />;
}
