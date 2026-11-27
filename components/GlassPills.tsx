import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LiquidGlassView } from "../modules/liquid-glass/src";
import { useTheme } from "../theme/useTheme";

type ActionProps = { icon: string; label: string; onPress: () => void; active?: boolean };
export function GlassActionPill({ icon, label, onPress, active = false }: ActionProps) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]} accessibilityRole="button" accessibilityLabel={label}>
    <View style={[styles.actionDisc, { borderColor: active ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.13)" }]}>
      <LiquidGlassView cornerRadius={28} style={StyleSheet.absoluteFill} />
      {active ? <View pointerEvents="none" style={styles.activeWash} /> : null}
      <Ionicons name={icon as never} size={20} color={active ? colors.accent : "#F5F3F4"} />
    </View>
    <Text numberOfLines={1} style={[styles.actionLabel, { color: active ? colors.text : colors.muted }]}>{label}</Text>
  </Pressable>;
}

type SegmentProps<T extends string> = { values: readonly T[]; selected: T; onSelect: (value: T) => void };
export function GlassSegmentedPill<T extends string>({ values, selected, onSelect }: SegmentProps<T>) {
  return <View style={styles.segmentShell}>
    <LiquidGlassView cornerRadius={28} style={StyleSheet.absoluteFill} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentContent} keyboardShouldPersistTaps="handled">
      {values.map((value) => {
        const active = value === selected;
        return <Pressable key={value} onPress={() => onSelect(value)} style={[styles.segment, active && styles.segmentActive]}>
          {active ? <View pointerEvents="none" style={styles.segmentHighlight} /> : null}
          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{value}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  action: { width: 68, alignItems: "center", gap: 7 },
  actionDisc: { width: 54, height: 54, borderRadius: 27, overflow: "hidden", borderWidth: 1, backgroundColor: "rgba(255,255,255,0.075)", alignItems: "center", justifyContent: "center" },
  activeWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(221,61,79,0.13)" },
  actionLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.1 },
  segmentShell: { minHeight: 48, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", backgroundColor: "rgba(255,255,255,0.055)", justifyContent: "center" },
  segmentContent: { padding: 4, alignItems: "center", gap: 3 },
  segment: { minHeight: 38, paddingHorizontal: 15, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  segmentActive: { backgroundColor: "#F4F3F4", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segmentHighlight: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.18)" },
  segmentText: { color: "rgba(255,255,255,0.66)", fontSize: 12, fontWeight: "600" },
  segmentTextActive: { color: "#171619", fontWeight: "700" }
});
