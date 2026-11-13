import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { usePreferencesStore, type AccentTheme, type AppearanceMode, type MotionStyle } from "../store/preferences";
import { useTheme } from "../theme/useTheme";

const accents: { id: AccentTheme; label: string; color: string }[] = [
  { id: "red", label: "Velvet", color: "#FA2D48" }, { id: "violet", label: "Amethyst", color: "#B69BFF" },
  { id: "blue", label: "Ocean", color: "#72B7F4" }, { id: "green", label: "Sage", color: "#8DD6B5" }
];
const appearanceModes: { id: AppearanceMode; label: string; detail: string; icon: string }[] = [
  { id: "system", label: "System", detail: "Follow your device appearance", icon: "phone-portrait-outline" },
  { id: "light", label: "Light", detail: "Bright surfaces and dark typography", icon: "sunny-outline" },
  { id: "dark", label: "Dark", detail: "Deep black surfaces and white typography", icon: "moon-outline" }
];
const motions: { id: MotionStyle; label: string; detail: string }[] = [
  { id: "full", label: "Expressive", detail: "Full scroll reveals and spring transitions" },
  { id: "subtle", label: "Subtle", detail: "Quieter movement and shorter transitions" },
  { id: "off", label: "Reduced motion", detail: "Keep the interface still" }
];

export default function AppearanceScreen() {
  const { colors, isDark } = useTheme();
  const appearanceMode = usePreferencesStore((s) => s.appearanceMode);
  const setAppearanceMode = usePreferencesStore((s) => s.setAppearanceMode);
  const accentTheme = usePreferencesStore((s) => s.accentTheme);
  const motionStyle = usePreferencesStore((s) => s.motionStyle);
  const compactRows = usePreferencesStore((s) => s.compactRows);
  const setAccentTheme = usePreferencesStore((s) => s.setAccentTheme);
  const setMotionStyle = usePreferencesStore((s) => s.setMotionStyle);
  const setCompactRows = usePreferencesStore((s) => s.setCompactRows);
  const styles = makeStyles(colors, isDark);

  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
      <View><Text style={styles.eyebrow}>MAKE IT YOURS</Text><Text style={styles.title}>Appearance</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Appearance</Text>
      <Text style={styles.copy}>Choose how LumaMusic looks. System follows your phone setting.</Text>
      <GlassSurface style={styles.panel} contentStyle={styles.motionPanel}>
        {appearanceModes.map((item, index) => <Pressable key={item.id} onPress={() => setAppearanceMode(item.id)} style={[styles.motionOption, index === appearanceModes.length - 1 && styles.last]}>
          <View style={styles.modeIcon}><Ionicons name={item.icon as never} size={18} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={styles.optionText}>{item.label}</Text><Text style={styles.optionDetail}>{item.detail}</Text></View>
          <Ionicons name={appearanceMode === item.id ? "radio-button-on" : "radio-button-off"} size={19} color={appearanceMode === item.id ? colors.accent : colors.subtle} />
        </Pressable>)}
      </GlassSurface>
      <Text style={styles.heading}>Choose your accent</Text>
      <Text style={styles.copy}>A little colour, without changing the character of the interface.</Text>
      <GlassSurface style={styles.panel} contentStyle={styles.accentGrid}>
        {accents.map((item) => <Pressable key={item.id} onPress={() => setAccentTheme(item.id)} style={[styles.accentOption, accentTheme === item.id && styles.selected]}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} /><Text style={styles.optionText}>{item.label}</Text>
          {accentTheme === item.id ? <Ionicons name="checkmark-circle" size={17} color={item.color} /> : null}
        </Pressable>)}
      </GlassSurface>
      <Text style={styles.heading}>Motion & animation</Text>
      <Text style={styles.copy}>Tune how LumaMusic moves.</Text>
      <GlassSurface style={styles.panel} contentStyle={styles.motionPanel}>
        {motions.map((item, index) => <Pressable key={item.id} onPress={() => setMotionStyle(item.id)} style={[styles.motionOption, index === motions.length - 1 && styles.last]}>
          <View style={{ flex: 1 }}><Text style={styles.optionText}>{item.label}</Text><Text style={styles.optionDetail}>{item.detail}</Text></View>
          <Ionicons name={motionStyle === item.id ? "radio-button-on" : "radio-button-off"} size={19} color={motionStyle === item.id ? colors.accent : colors.subtle} />
        </Pressable>)}
      </GlassSurface>
      <Text style={styles.heading}>Listening layout</Text>
      <GlassSurface style={styles.panel} contentStyle={styles.switchRow}>
        <View style={{ flex: 1 }}><Text style={styles.optionText}>Compact track rows</Text><Text style={styles.optionDetail}>Fit more music on screen with tighter spacing.</Text></View>
        <Switch value={compactRows} onValueChange={setCompactRows} trackColor={{ false: isDark ? "#343840" : "#D1D1D6", true: colors.accentStrong }} thumbColor="#FFFFFF" />
      </GlassSurface>
      <View style={styles.note}><Ionicons name="sparkles-outline" size={16} color={colors.accent} /><Text style={styles.noteText}>Your choices are saved on this device.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background }, header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 }, title: { color: c.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 2 },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 }, heading: { color: c.text, fontSize: 17, fontWeight: "700", marginTop: 22, marginBottom: 5 },
    copy: { color: c.muted, fontSize: 12, lineHeight: 18, marginBottom: 12 }, panel: { borderRadius: 19 },
    accentGrid: { padding: 10, gap: 7 }, accentOption: { minHeight: 48, borderRadius: 13, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "transparent" },
    selected: { backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.035)", borderColor: c.border },
    swatch: { width: 19, height: 19, borderRadius: 10 }, optionText: { color: c.text, fontSize: 13, fontWeight: "600" },
    motionPanel: { paddingHorizontal: 14 }, motionOption: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    last: { borderBottomWidth: 0 }, optionDetail: { color: c.muted, fontSize: 10, marginTop: 4 },
    modeIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center" },
    switchRow: { minHeight: 72, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 12 },
    note: { flexDirection: "row", gap: 9, alignItems: "center", marginTop: 22, padding: 14, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)" },
    noteText: { color: c.muted, fontSize: 10, lineHeight: 16, flex: 1 }
  });
}
