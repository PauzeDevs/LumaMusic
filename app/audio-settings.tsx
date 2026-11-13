import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayerStore } from "../store/player";
import { usePreferencesStore, type ReverbPreset } from "../store/preferences";
import type { ThemePalette } from "../theme/colors";
import { useTheme } from "../theme/useTheme";

const BANDS = [
  { label: "60", detail: "SUB BASS", frequency: "60 Hz" },
  { label: "250", detail: "BASS", frequency: "250 Hz" },
  { label: "1K", detail: "MIDS", frequency: "1 kHz" },
  { label: "4K", detail: "PRESENCE", frequency: "4 kHz" },
  { label: "12K", detail: "AIR", frequency: "12 kHz" }
];
const PRESETS = [
  { label: "Flat", values: [0, 0, 0, 0, 0] },
  { label: "Bass", values: [7, 5, 0, -1, 1] },
  { label: "Vocal", values: [-2, 0, 4, 3, 1] },
  { label: "Bright", values: [0, -1, 1, 4, 6] }
];
const REVERB_OPTIONS: { value: ReverbPreset; label: string; detail: string }[] = [
  { value: "off", label: "Off", detail: "Original" },
  { value: "room", label: "Room", detail: "Intimate" },
  { value: "studio", label: "Studio", detail: "Controlled" },
  { value: "hall", label: "Hall", detail: "Wide space" }
];

function GainSlider({ label, value, onChange, accent, muted }: { label: string; value: number; onChange: (value: number) => void; accent: string; muted: string }) {
  const width = useRef(1);
  const update = (x: number) => onChange(Math.round((Math.max(0, Math.min(width.current, x)) / width.current * 24 - 12) * 10) / 10);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => update(event.nativeEvent.locationX),
    onPanResponderMove: (event) => update(event.nativeEvent.locationX)
  }), [onChange]);
  return <View style={styles.bandRow}>
    <View style={styles.bandLabels}><Text style={styles.bandFrequency}>{label}</Text><Text style={styles.bandValue}>{value > 0 ? "+" : ""}{value.toFixed(1)} dB</Text></View>
    <View onLayout={(event) => { width.current = event.nativeEvent.layout.width; }} {...responder.panHandlers} style={styles.sliderTouch}>
      <View style={[styles.sliderTrack, { backgroundColor: muted }]} />
      <View style={[styles.sliderZero, { left: "50%" }]} />
      <View style={[styles.sliderFill, { width: Math.abs(value) / 12 * 50 + "%", left: value < 0 ? 50 - Math.abs(value) / 12 * 50 + "%" : "50%", backgroundColor: accent }]} />
      <View style={[styles.sliderThumb, { left: (value + 12) / 24 * 100 + "%", borderColor: accent }]} />
    </View>
    <Text style={styles.bandHint}>{BANDS.find((band) => band.label === label)?.detail}</Text>
  </View>;
}

export default function AudioSettingsScreen() {
  const { colors } = useTheme();
  const stylesForScreen = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const equalizerEnabled = usePreferencesStore((state) => state.equalizerEnabled);
  const equalizerBands = usePreferencesStore((state) => state.equalizerBands);
  const setEqualizerEnabled = usePreferencesStore((state) => state.setEqualizerEnabled);
  const setEqualizerBand = usePreferencesStore((state) => state.setEqualizerBand);
  const resetEqualizer = usePreferencesStore((state) => state.resetEqualizer);
  const spatialBalance = usePreferencesStore((state) => state.spatialBalance);
  const setSpatialBalance = usePreferencesStore((state) => state.setSpatialBalance);
  const reverbPreset = usePreferencesStore((state) => state.reverbPreset);
  const setReverbPreset = usePreferencesStore((state) => state.setReverbPreset);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const localPlayback = currentTrack?.source === "local";
  const balanceWidth = useRef(1);
  const [balanceRailWidth, setBalanceRailWidth] = useState(1);
  const setBalanceFromX = (x: number) => setSpatialBalance(Math.max(-1, Math.min(1, (x / balanceRailWidth) * 2 - 1)));
  const balanceResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setBalanceFromX(event.nativeEvent.locationX),
    onPanResponderMove: (event) => setBalanceFromX(event.nativeEvent.locationX)
  }), [balanceRailWidth]);
  const balancePercent = Math.round(Math.abs(spatialBalance) * 100);
  const balanceLabel = spatialBalance < -0.015 ? "LEFT " + balancePercent + "%" : spatialBalance > 0.015 ? "RIGHT " + balancePercent + "%" : "CENTRED";
  const dots = Array.from({ length: Math.ceil(width / 28) * 26 }, (_, index) => ({ left: (index % Math.ceil(width / 28)) * 28 + 7, top: Math.floor(index / Math.ceil(width / 28)) * 28 + 7 }));

  const applyPreset = (values: number[]) => values.forEach((value, index) => setEqualizerBand(index, value));

  return <SafeAreaView style={stylesForScreen.safe} edges={["top", "bottom"]}>
    <View pointerEvents="none" style={stylesForScreen.dotLayer}>{dots.map((dot, index) => <View key={index} style={[stylesForScreen.dot, { left: dot.left, top: dot.top }]} />)}</View>
    <View style={stylesForScreen.header}>
      <Pressable onPress={() => router.back()} style={stylesForScreen.back}><Ionicons name="chevron-back" size={23} color="#FFFFFF" /></Pressable>
      <View style={{ flex: 1 }}><Text style={stylesForScreen.eyebrow}>LUMAMUSIC · SOUND DESIGN</Text><Text style={stylesForScreen.title}>Audio Lab</Text></View>
      <View style={stylesForScreen.headerMark}><Ionicons name="options-outline" size={21} color="#FFFFFF" /></View>
    </View>
    <ScrollView contentContainerStyle={stylesForScreen.content} showsVerticalScrollIndicator={false}>
      <Text style={stylesForScreen.hero}>Make every{ "\n" }frequency yours.</Text>
      <Text style={stylesForScreen.intro}>Shape the sound, tune the space, and keep your settings saved on this device.</Text>

      <View style={stylesForScreen.featureCard}>
        <View style={stylesForScreen.cardHeader}>
          <View style={stylesForScreen.cardIcon}><Ionicons name="options" size={21} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={stylesForScreen.cardEyebrow}>01 · TONE CONTROL</Text><Text style={stylesForScreen.cardTitle}>Equalizer</Text></View>
          <Pressable onPress={() => setEqualizerEnabled(!equalizerEnabled)} style={[stylesForScreen.toggle, equalizerEnabled && stylesForScreen.toggleOn]}>
            <View style={[stylesForScreen.toggleDot, equalizerEnabled && stylesForScreen.toggleDotOn]} />
          </Pressable>
        </View>
        <View style={stylesForScreen.eqArtwork}>
          {[18, 35, 24, 46, 30, 52, 38, 25, 43, 34, 49, 28, 40, 20, 33, 46, 26, 39, 18].map((height, index) => <View key={index} style={[stylesForScreen.eqArtBar, { height, backgroundColor: index % 3 === 0 ? colors.accent : "#66666D" }]} />)}
        </View>
        <View style={stylesForScreen.presetRow}>{PRESETS.map((preset) => <Pressable key={preset.label} onPress={() => applyPreset(preset.values)} style={stylesForScreen.presetChip}><Text style={stylesForScreen.presetText}>{preset.label}</Text></Pressable>)}</View>
        <View style={[stylesForScreen.bandGrid, !equalizerEnabled && { opacity: 0.42 }]} pointerEvents={equalizerEnabled ? "auto" : "none"}>
          {BANDS.map((band, index) => <GainSlider key={band.label} label={band.label} value={equalizerBands[index] ?? 0} onChange={(value) => setEqualizerBand(index, value)} accent={colors.accent} muted="#38383E" />)}
        </View>
        <View style={stylesForScreen.cardFooter}>
          <Text style={stylesForScreen.smallNote}>{equalizerEnabled ? "EQUALIZER ON" : "EQUALIZER OFF"} · ±12 dB</Text>
          <Pressable onPress={resetEqualizer}><Text style={stylesForScreen.reset}>Reset</Text></Pressable>
        </View>
        {!localPlayback ? <Text style={stylesForScreen.sourceNote}>Equalizer processing currently applies to imported local audio. Streaming-source processing is not exposed by the current playback engine.</Text> : <Text style={stylesForScreen.sourceNote}>Live processing is active for this imported local track.</Text>}
      </View>

      <View style={stylesForScreen.featureCard}>
        <View style={stylesForScreen.cardHeader}>
          <View style={stylesForScreen.cardIcon}><Ionicons name="water-outline" size={21} color={colors.accent} /></View>
          <View style={{ flex: 1 }}><Text style={stylesForScreen.cardEyebrow}>02 · SPACE & DEPTH</Text><Text style={stylesForScreen.cardTitle}>Audio effects</Text></View>
          <View style={stylesForScreen.activePill}><Text style={stylesForScreen.activePillText}>{reverbPreset.toUpperCase()}</Text></View>
        </View>
        <Text style={stylesForScreen.sectionLabel}>REVERB PRESET</Text>
        <View style={stylesForScreen.reverbGrid}>{REVERB_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => setReverbPreset(option.value)} style={[stylesForScreen.reverbOption, reverbPreset === option.value && stylesForScreen.reverbActive]}><Text style={[stylesForScreen.reverbTitle, reverbPreset === option.value && stylesForScreen.reverbTitleActive]}>{option.label}</Text><Text style={stylesForScreen.reverbDetail}>{option.detail}</Text></Pressable>)}</View>
        <View style={stylesForScreen.separator} />
        <View style={stylesForScreen.balanceHeading}><View style={{ flex: 1 }}><Text style={stylesForScreen.sectionLabel}>STEREO BALANCE</Text><Text style={stylesForScreen.cardSub}>Shift the mix between left and right.</Text></View><Text style={stylesForScreen.balanceValue}>{balanceLabel}</Text></View>
        <View style={stylesForScreen.balanceTouch} onLayout={(event) => { balanceRailWidth.current = event.nativeEvent.layout.width; setBalanceRailWidth(event.nativeEvent.layout.width); }} {...balanceResponder.panHandlers}>
          <View style={stylesForScreen.balanceRail}><View style={stylesForScreen.balanceCenter} /><View style={[stylesForScreen.balanceThumb, { left: ((spatialBalance + 1) / 2) * 100 + "%" }]} /></View>
        </View>
        <View style={stylesForScreen.balanceLabels}><Text>LEFT</Text><Text>CENTER</Text><Text>RIGHT</Text></View>
        <Pressable style={stylesForScreen.resetBalance} onPress={() => setSpatialBalance(0)}><Text style={stylesForScreen.reset}>Reset balance</Text></Pressable>
        <Text style={stylesForScreen.sourceNote}>{localPlayback ? "Reverb and stereo balance are applied live to this local track." : "These effects are saved and apply to imported local audio. Streaming playback does not currently expose an effects graph."}</Text>
      </View>

      <View style={stylesForScreen.featureCard}>
        <View style={stylesForScreen.cardHeader}>
          <View style={stylesForScreen.cardIcon}><Ionicons name="swap-horizontal-outline" size={21} color="#85858D" /></View>
          <View style={{ flex: 1 }}><Text style={stylesForScreen.cardEyebrow}>03 · TRACK TRANSITIONS</Text><Text style={stylesForScreen.cardTitle}>Crossfade</Text></View>
          <View style={stylesForScreen.soonPill}><Text style={stylesForScreen.soonText}>IN DEVELOPMENT</Text></View>
        </View>
        <Text style={stylesForScreen.cardSub}>Seamless transitions between tracks need a dual-stream playback path. The current player uses a single active stream, so this control is not exposed as a fake switch.</Text>
      </View>

      <View style={stylesForScreen.featureCard}>
        <View style={stylesForScreen.cardHeader}>
          <View style={stylesForScreen.cardIcon}><Ionicons name="disc-outline" size={21} color="#85858D" /></View>
          <View style={{ flex: 1 }}><Text style={stylesForScreen.cardEyebrow}>04 · SOURCE QUALITY</Text><Text style={stylesForScreen.cardTitle}>Lossless audio</Text></View>
          <View style={stylesForScreen.soonPill}><Text style={stylesForScreen.soonText}>SOURCE DEPENDENT</Text></View>
        </View>
        <Text style={stylesForScreen.cardSub}>Audio quality is determined by the provider's stream. LumaMusic won't label a stream lossless unless the source actually supplies lossless audio.</Text>
      </View>

      <View style={stylesForScreen.footer}><Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} /><Text style={stylesForScreen.footerText}>Your Audio Lab preferences are saved automatically.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

function makeStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#09090B" },
  dotLayer: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  dot: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.075)" },
  header: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#202024", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: "#FFFFFF", fontSize: 27, fontWeight: "900", letterSpacing: -0.8, marginTop: 2 },
  headerMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#202024", alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 21, paddingBottom: 38 },
  hero: { color: "#FFFFFF", fontSize: 37, lineHeight: 39, fontWeight: "900", letterSpacing: -1.6 },
  intro: { color: "#9A9AA2", fontSize: 13, lineHeight: 20, marginTop: 10, marginBottom: 23, maxWidth: 320 },
  featureCard: { backgroundColor: "#171719", borderRadius: 25, borderWidth: 1, borderColor: "#303035", padding: 18, marginBottom: 15, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#252529", alignItems: "center", justifyContent: "center" },
  cardEyebrow: { color: "#92929A", fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  cardTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
  toggle: { width: 45, height: 27, borderRadius: 15, backgroundColor: "#3A3A40", padding: 3, justifyContent: "center" },
  toggleOn: { backgroundColor: colors.accent },
  toggleDot: { width: 21, height: 21, borderRadius: 11, backgroundColor: "#FFFFFF" },
  toggleDotOn: { alignSelf: "flex-end" },
  eqArtwork: { height: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, backgroundColor: "#101012", borderRadius: 16, marginTop: 17, marginBottom: 15 },
  eqArtBar: { width: 5, borderRadius: 4 },
  presetRow: { flexDirection: "row", gap: 7, marginBottom: 15 },
  presetChip: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11, backgroundColor: "#252529", borderWidth: 1, borderColor: "#37373D" },
  presetText: { color: "#D7D7DC", fontSize: 10, fontWeight: "700" },
  bandGrid: { gap: 14 },
  bandRow: { gap: 7 },
  bandLabels: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bandFrequency: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  bandValue: { color: "#BDBDC4", fontSize: 10, fontVariant: ["tabular-nums"] },
  sliderTouch: { height: 25, justifyContent: "center" },
  sliderTrack: { height: 4, borderRadius: 3, width: "100%" },
  sliderZero: { position: "absolute", width: 1, height: 12, backgroundColor: "#8A8A92", top: 6 },
  sliderFill: { position: "absolute", height: 4, borderRadius: 3 },
  sliderThumb: { position: "absolute", width: 14, height: 14, borderRadius: 8, marginLeft: -7, backgroundColor: "#FFFFFF", borderWidth: 2, top: 5 },
  bandHint: { color: "#73737C", fontSize: 7, fontWeight: "800", letterSpacing: 1.1 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 15 },
  smallNote: { color: "#85858D", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  reset: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  sourceNote: { color: "#898991", fontSize: 9, lineHeight: 14, marginTop: 13 },
  activePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.08)" },
  activePillText: { color: colors.accent, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  sectionLabel: { color: "#8E8E96", fontSize: 8, fontWeight: "900", letterSpacing: 1.3 },
  reverbGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  reverbOption: { flexGrow: 1, width: "47%", padding: 12, borderRadius: 13, backgroundColor: "#222226", borderWidth: 1, borderColor: "#35353B" },
  reverbActive: { borderColor: colors.accent, backgroundColor: "rgba(255,255,255,0.08)" },
  reverbTitle: { color: "#BDBDC4", fontSize: 11, fontWeight: "800" },
  reverbTitleActive: { color: "#FFFFFF" },
  reverbDetail: { color: "#777780", fontSize: 9, marginTop: 4 },
  separator: { height: 1, backgroundColor: "#303035", marginVertical: 17 },
  balanceHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardSub: { color: "#A1A1A9", fontSize: 11, lineHeight: 17, marginTop: 7 },
  balanceValue: { color: colors.accent, fontSize: 9, fontWeight: "900" },
  balanceTouch: { height: 34, justifyContent: "center", marginTop: 10 },
  balanceRail: { height: 4, borderRadius: 3, backgroundColor: "#3A3A40", position: "relative" },
  balanceCenter: { position: "absolute", left: "50%", top: -5, width: 1, height: 14, backgroundColor: "#A0A0A8" },
  balanceThumb: { position: "absolute", top: -6, width: 16, height: 16, borderRadius: 9, marginLeft: -8, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: colors.accent },
  balanceLabels: { flexDirection: "row", justifyContent: "space-between" },
  resetBalance: { alignSelf: "flex-end", paddingVertical: 8 },
  soonPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: "#252529" },
  soonText: { color: "#96969E", fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  footerText: { color: "#92929A", fontSize: 10 }
}); }
