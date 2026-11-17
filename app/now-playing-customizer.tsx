import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { usePreferencesStore, type PlayerStyle, type SurfaceStyle, type MotionStyle, type ProgressBarStyle } from "../store/preferences";
import { useTheme } from "../theme/useTheme";

const players: { id: PlayerStyle; title: string; detail: string; icon: string }[] = [
  { id: "standard", title: "Classic", detail: "Clean square artwork and familiar controls", icon: "albums-outline" },
  { id: "vinyl", title: "Vinyl", detail: "Spinning record, grooves and raised centre spindle", icon: "disc-outline" },
  { id: "poster", title: "Poster", detail: "Portrait artwork with an editorial stamp", icon: "image-outline" }
];
const surfaces: { id: SurfaceStyle; title: string; detail: string }[] = [
  { id: "liquid", title: "Liquid glass", detail: "Live blur, translucent depth and a bright edge" },
  { id: "frosted", title: "Frosted", detail: "Stronger blur with a softer, milky surface" },
  { id: "clear", title: "Clear", detail: "Light tint and high transparency" },
  { id: "matte", title: "Dark matte", detail: "Solid surfaces with no blur" }
];
const motions: { id: MotionStyle; title: string; detail: string }[] = [
  { id: "full", title: "Full", detail: "Expressive artwork movement while playing" },
  { id: "subtle", title: "Subtle", detail: "Slower, smaller movement" },
  { id: "off", title: "Off", detail: "No continuous artwork motion" }
];
const progressStyles: { id: ProgressBarStyle; title: string }[] = [
  { id: "apple", title: "Minimal" }, { id: "classic", title: "Classic" }, { id: "waveform", title: "Waveform" }
];

export default function NowPlayingCustomizerScreen() {
  const { colors } = useTheme();
  const playerStyle = usePreferencesStore(s => s.playerStyle);
  const surfaceStyle = usePreferencesStore(s => s.surfaceStyle);
  const motionStyle = usePreferencesStore(s => s.motionStyle);
  const animationIntensity = usePreferencesStore(s => s.animationIntensity);
  const progressBarStyle = usePreferencesStore(s => s.progressBarStyle);
  const setPlayerStyle = usePreferencesStore(s => s.setPlayerStyle);
  const setSurfaceStyle = usePreferencesStore(s => s.setSurfaceStyle);
  const setMotionStyle = usePreferencesStore(s => s.setMotionStyle);
  const setAnimationIntensity = usePreferencesStore(s => s.setAnimationIntensity);
  const setProgressBarStyle = usePreferencesStore(s => s.setProgressBarStyle);
  const styles = makeStyles(colors);

  const option = (selected: boolean) => [styles.option, selected && styles.selected];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>YOUR LISTENING SPACE</Text>
          <Text style={styles.title}>Now Playing</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.done}><Text style={styles.doneText}>Done</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <View style={[styles.previewDisc, playerStyle === "vinyl" && styles.previewVinyl, playerStyle === "poster" && styles.previewPoster]}>
            {playerStyle === "vinyl" ? <><View style={styles.previewGroove} /><View style={styles.previewLabel} /><View style={styles.previewSpindle} /></> : <Ionicons name={playerStyle === "poster" ? "image-outline" : "musical-notes"} size={32} color={colors.accent} />}
          </View>
          <Text style={styles.previewTitle}>{playerStyle === "vinyl" ? "Vinyl edition" : playerStyle === "poster" ? "Poster edition" : "Classic edition"}</Text>
          <Text style={styles.previewCaption}>Changes apply instantly to Now Playing</Text>
        </View>

        <Text style={styles.heading}>Player design</Text>
        <Text style={styles.copy}>Choose a layout, not just a different artwork crop.</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.list}>
          {players.map((item, index) => <Pressable key={item.id} onPress={() => setPlayerStyle(item.id)} style={[...option(playerStyle === item.id), index === players.length - 1 && styles.last]}>
            <View style={styles.optionIcon}><Ionicons name={item.icon as never} size={20} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.optionDetail}>{item.detail}</Text></View>
            <Ionicons name={playerStyle === item.id ? "checkmark-circle" : "ellipse-outline"} size={20} color={playerStyle === item.id ? colors.accent : colors.subtle} />
          </Pressable>)}
        </GlassSurface>

        <Text style={styles.heading}>Surface finish</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.list}>
          {surfaces.map((item, index) => <Pressable key={item.id} onPress={() => setSurfaceStyle(item.id)} style={[...option(surfaceStyle === item.id), index === surfaces.length - 1 && styles.last]}>
            <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.optionDetail}>{item.detail}</Text></View>
            <Ionicons name={surfaceStyle === item.id ? "checkmark-circle" : "ellipse-outline"} size={20} color={surfaceStyle === item.id ? colors.accent : colors.subtle} />
          </Pressable>)}
        </GlassSurface>

        <Text style={styles.heading}>Motion</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.list}>
          {motions.map((item, index) => <Pressable key={item.id} onPress={() => setMotionStyle(item.id)} style={[...option(motionStyle === item.id), index === motions.length - 1 && styles.last]}>
            <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{item.title}</Text><Text style={styles.optionDetail}>{item.detail}</Text></View>
            <Ionicons name={motionStyle === item.id ? "checkmark-circle" : "ellipse-outline"} size={20} color={motionStyle === item.id ? colors.accent : colors.subtle} />
          </Pressable>)}
        </GlassSurface>

        <Text style={styles.heading}>Animation intensity</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.intensityRow}>
          {[{ value: 20, label: "Quiet" }, { value: 60, label: "Balanced" }, { value: 100, label: "Expressive" }].map(item => <Pressable key={item.value} onPress={() => setAnimationIntensity(item.value)} style={[styles.intensityOption, animationIntensity === item.value && styles.selected]}>
            <Text style={[styles.optionTitle, animationIntensity === item.value && { color: colors.accent }]}>{item.label}</Text>
          </Pressable>)}
        </GlassSurface>

        <Text style={styles.heading}>Progress bar</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.intensityRow}>
          {progressStyles.map(item => <Pressable key={item.id} onPress={() => setProgressBarStyle(item.id)} style={[styles.intensityOption, progressBarStyle === item.id && styles.selected]}>
            <Text style={[styles.optionTitle, progressBarStyle === item.id && { color: colors.accent }]}>{item.title}</Text>
          </Pressable>)}
        </GlassSurface>
        <View style={styles.note}><Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} /><Text style={styles.noteText}>Your choices save automatically on this device.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
    done: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 15, backgroundColor: c.surfaceSoft, borderWidth: 1, borderColor: c.border },
    doneText: { color: c.accent, fontSize: 12, fontWeight: "800" },
    eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
    title: { color: c.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.7, marginTop: 2 },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
    preview: { minHeight: 190, borderRadius: 24, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 12, padding: 18 },
    previewDisc: { width: 92, height: 92, borderRadius: 46, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
    previewVinyl: { backgroundColor: "#17171A", borderColor: "rgba(255,255,255,0.24)" },
    previewPoster: { width: 68, height: 92, borderRadius: 9 },
    previewGroove: { position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
    previewLabel: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent },
    previewSpindle: { position: "absolute", width: 9, height: 9, borderRadius: 5, backgroundColor: "#D5D5D9", borderWidth: 1, borderColor: "#FFFFFF" },
    previewTitle: { color: c.text, fontSize: 15, fontWeight: "800", marginTop: 13 },
    previewCaption: { color: c.muted, fontSize: 10, marginTop: 4 },
    heading: { color: c.text, fontSize: 17, fontWeight: "800", marginTop: 22, marginBottom: 6 },
    copy: { color: c.muted, fontSize: 11, lineHeight: 17, marginBottom: 10 },
    panel: { borderRadius: 19 },
    list: { paddingHorizontal: 13 },
    option: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: c.border },
    selected: { backgroundColor: "rgba(255,255,255,0.055)", borderRadius: 12, borderColor: c.border, borderWidth: 1, paddingHorizontal: 9 },
    last: { borderBottomWidth: 0 },
    optionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    optionTitle: { color: c.text, fontSize: 13, fontWeight: "700" },
    optionDetail: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
    intensityRow: { flexDirection: "row", gap: 7, padding: 10 },
    intensityOption: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    note: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 22, padding: 14, borderRadius: 14, backgroundColor: c.surfaceSoft },
    noteText: { color: c.muted, fontSize: 10, flex: 1, lineHeight: 16 }
  });
}
