import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { colors } from "../theme/colors";
import { usePreferencesStore, type AccentTheme, type AppearanceMode, type MotionStyle } from "../store/preferences";

const accents: { id: AccentTheme; label: string; color: string }[] = [
  { id: "red", label: "Velvet", color: "#F05A68" },
  { id: "violet", label: "Amethyst", color: "#B69BFF" },
  { id: "blue", label: "Ocean", color: "#72B7F4" },
  { id: "green", label: "Sage", color: "#8DD6B5" }
];
const appearanceModes: { id: AppearanceMode; label: string; detail: string }[] = [\n  { id: "system", label: "System", detail: "Follow your device appearance" },\n  { id: "light", label: "Light", detail: "Bright surfaces and dark typography" },\n  { id: "dark", label: "Dark", detail: "Deep black surfaces and white typography" }\n];\nconst motions: { id: MotionStyle; label: string; detail: string }[] = [
  { id: "full", label: "Expressive", detail: "Full scroll reveals and spring transitions" },
  { id: "subtle", label: "Subtle", detail: "Quieter movement and shorter transitions" },
  { id: "off", label: "Reduced motion", detail: "Keep the interface still" }
];

export default function AppearanceScreen() {
  const appearanceMode = usePreferencesStore((s) => s.appearanceMode);\n  const setAppearanceMode = usePreferencesStore((s) => s.setAppearanceMode);\n  const accentTheme = usePreferencesStore((s) => s.accentTheme);
  const motionStyle = usePreferencesStore((s) => s.motionStyle);
  const compactRows = usePreferencesStore((s) => s.compactRows);
  const setAccentTheme = usePreferencesStore((s) => s.setAccentTheme);
  const setMotionStyle = usePreferencesStore((s) => s.setMotionStyle);
  const setCompactRows = usePreferencesStore((s) => s.setCompactRows);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View><Text style={styles.eyebrow}>MAKE IT YOURS</Text><Text style={styles.title}>Appearance</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Appearance</Text>\n        <Text style={styles.copy}>Choose how LumaMusic looks. System follows your phone setting.</Text>\n        <GlassSurface style={styles.panel} contentStyle={styles.motionPanel}>\n          {appearanceModes.map((item, index) => (\n            <Pressable key={item.id} onPress={() => setAppearanceMode(item.id)} style={[styles.motionOption, index === appearanceModes.length - 1 && styles.last]}>\n              <View style={{ flex: 1 }}>\n                <Text style={styles.optionText}>{item.label}</Text>\n                <Text style={styles.optionDetail}>{item.detail}</Text>\n              </View>\n              <Ionicons name={appearanceMode === item.id ? "radio-button-on" : "radio-button-off"} size={19} color={appearanceMode === item.id ? colors.accent : colors.subtle} />\n            </Pressable>\n          ))}\n        </GlassSurface>\n\n        <Text style={styles.heading}>Choose your accent</Text>
        <Text style={styles.copy}>Apple Music-inspired red, with optional accent colours.</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.accentGrid}>
          {accents.map((item) => (
            <Pressable key={item.id} onPress={() => setAccentTheme(item.id)} style={[styles.accentOption, accentTheme === item.id && styles.selected]}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <Text style={styles.optionText}>{item.label}</Text>
              {accentTheme === item.id ? <Ionicons name="checkmark-circle" size={17} color={item.color} /> : null}
            </Pressable>
          ))}
        </GlassSurface>

        <Text style={styles.heading}>Motion & animation</Text>
        <Text style={styles.copy}>Tune how LumaMusic moves. Smoothness depends on your device and display refresh rate.</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.motionPanel}>
          {motions.map((item, index) => (
            <Pressable key={item.id} onPress={() => setMotionStyle(item.id)} style={[styles.motionOption, index === motions.length - 1 && styles.last]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{item.label}</Text>
                <Text style={styles.optionDetail}>{item.detail}</Text>
              </View>
              <Ionicons name={motionStyle === item.id ? "radio-button-on" : "radio-button-off"} size={19} color={motionStyle === item.id ? colors.accent : colors.subtle} />
            </Pressable>
          ))}
        </GlassSurface>

        <Text style={styles.heading}>Listening layout</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionText}>Compact track rows</Text>
            <Text style={styles.optionDetail}>Fit more music on screen with tighter spacing.</Text>
          </View>
          <Switch value={compactRows} onValueChange={setCompactRows} trackColor={{ false: "#343840", true: colors.accentStrong }} thumbColor="#FFFFFF" />
        </GlassSurface>
        <View style={styles.note}><Ionicons name="sparkles-outline" size={16} color={colors.accent} /><Text style={styles.noteText}>Your choices are saved on this device. More layout controls can be added as the app grows.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  heading: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 22, marginBottom: 5 },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  panel: { borderRadius: 19 },
  accentGrid: { padding: 10, gap: 7 },
  accentOption: { minHeight: 48, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "transparent" },
  selected: { backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.12)" },
  swatch: { width: 19, height: 19, borderRadius: 10 },
  optionText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  motionPanel: { paddingHorizontal: 14 },
  motionOption: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  optionDetail: { color: colors.muted, fontSize: 10, marginTop: 4 },
  switchRow: { minHeight: 72, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  note: { flexDirection: "row", gap: 9, alignItems: "center", marginTop: 22, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.035)" },
  noteText: { color: colors.muted, fontSize: 10, lineHeight: 16, flex: 1 }
}) as Record<string, any>;
