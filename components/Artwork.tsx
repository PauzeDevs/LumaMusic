import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/useTheme";

type ArtworkProps = { uri: string; size: number; radius?: number };
export function Artwork({ uri, size, radius = 16 }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  const { colors } = useTheme();
  useEffect(() => { setFailed(false); }, [uri]);
  return <View style={[styles.frame, { width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
    {failed || !uri ? <View style={[styles.fallback, { backgroundColor: colors.surfaceSoft }]}>
      <Ionicons name="musical-notes" size={Math.max(18, size * 0.28)} color={colors.accent} />
    </View> : <Image source={{ uri }} resizeMethod="resize" resizeMode="cover" onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius }} />}
  </View>;
}
const styles = StyleSheet.create({
  frame: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" }
});
