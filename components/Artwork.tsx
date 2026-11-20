import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { usePreferencesStore } from "../store/preferences";
import { useTheme } from "../theme/useTheme";

type ArtworkProps = { uri: string; size: number; radius?: number };
export function Artwork({ uri, size, radius = 16 }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const { colors } = useTheme();
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    fade.stopAnimation();
    fade.setValue(motionStyle === "off" ? 1 : 0);
  }, [uri, motionStyle, fade]);
  const reveal = () => {
    if (loaded) return;
    setLoaded(true);
    if (motionStyle === "off") { fade.setValue(1); return; }
    Animated.timing(fade, { toValue: 1, duration: motionStyle === "subtle" ? 220 : 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  return <View style={[styles.frame, { width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
    {failed || !uri ? <View style={[styles.fallback, { backgroundColor: colors.surfaceSoft }]}>
      <Ionicons name="musical-notes" size={Math.max(18, size * 0.28)} color={colors.accent} />
    </View>  : <Animated.Image source={{ uri }} resizeMethod="resize" resizeMode="cover" onLoad={reveal} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }} />}
  </View>;
}
const styles = StyleSheet.create({
  frame: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" }
});
