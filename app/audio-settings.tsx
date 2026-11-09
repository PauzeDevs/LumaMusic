import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { usePlayerStore } from "../store/player";
import { usePreferencesStore, type ReverbPreset } from "../store/preferences";
import { colors } from "../theme/colors";

const REVERB_OPTIONS: { value: ReverbPreset; label: string; detail: string }[] = [
  { value: "off", label: "Off", detail: "Original sound" },
  { value: "room", label: "Room", detail: "Small, intimate space" },
  { value: "studio", label: "Studio", detail: "Soft controlled reflections" },
  { value: "hall", label: "Hall", detail: "Wide, long ambience" }
];

export default function AudioSettingsScreen() {
  const progressBarStyle = usePreferencesStore((state) => state.progressBarStyle);
  const setProgressBarStyle = usePreferencesStore((state) => state.setProgressBarStyle);
  const spatialBalance = usePreferencesStore((state) => state.spatialBalance);
  const setSpatialBalance = usePreferencesStore((state) => state.setSpatialBalance);
  const reverbPreset = usePreferencesStore((state) => state.reverbPreset);
  const setReverbPreset = usePreferencesStore((state) => state.setReverbPreset);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const localPlayback = currentTrack?.source === "local";
  const railWidth = useRef(1);
  const startX = useRef(0);
  const [balanceWidth, setBalanceWidth] = useState(1);
  const setBalanceFromX = (x: number) => setSpatialBalance(Math.max(-1, Math.min(1, (x / balanceWidth) * 2 - 1)));
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      startX.current = event.nativeEvent.locationX;
      setBalanceFromX(startX.current);
    },
    onPanResponderMove: (_event, gesture) => setBalanceFromX(startX.current + gesture.dx)
  }), [balanceWidth, setSpatialBalance]);
  const balancePercent = Math.round(Math.abs(spatialBalance) * 100);
  const balanceLabel = spatialBalance < -0.015 ? "Left " + balancePercent + "%" : spatialBalance > 0.015 ? "Right " + balancePercent + "%" : "Centered";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View><Text style={styles.eyebrow}>PERSONALISE YOUR SOUND</Text><Text style={styles.title}>Audio settings</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Playback appearance</Text>
        <Text style={styles.sectionCopy}>Choose how the progress bar looks while LumaMusic controls playback.</Text>
        <View style={styles.choiceRow}>
          <Pressable onPress={() => setProgressBarStyle("apple")} style={styles.choicePressable}>
            <GlassSurface style={[styles.choice, progressBarStyle === "apple" && styles.choiceActive]} contentStyle={styles.choiceContent}>
              <View style={styles.previewTrack}><View style={styles.previewFill} /><View style={styles.previewDot} /></View>
              <Text style={styles.choiceTitle}>Apple Music</Text>
              <Text style={styles.choiceSub}>Slim line and floating thumb</Text>
              {progressBarStyle === "apple" ? <Ionicons name="checkmark-circle" size={17} color={colors.accent} /> : null}
            </GlassSurface>
          </Pressable>
          <Pressable onPress={() => setProgressBarStyle("classic")} style={styles.choicePressable}>
            <GlassSurface style={[styles.choice, progressBarStyle === "classic" && styles.choiceActive]} contentStyle={styles.choiceContent}>
              <View style={styles.previewTrackClassic}><View style={styles.previewFillClassic} /><View style={styles.previewDotClassic} /></View>
              <Text style={styles.choiceTitle}>Classic</Text>
              <Text style={styles.choiceSub}>Raised bar with a larger handle</Text>
              {progressBarStyle === "classic" ? <Ionicons name="checkmark-circle" size={17} color={colors.accent} /> : null}
            </GlassSurface>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, styles.effectsHeading]}>Spatial balance</Text>
        <Text style={styles.sectionCopy}>Move the stereo image toward the left or right channel. Changes apply live to imported audio playing inside LumaMusic.</Text>
        <GlassSurface style={styles.effectCard} contentStyle={styles.effectContent}>
          <View style={styles.effectTop}>
            <View style={styles.effectIcon}><Ionicons name="headset-outline" size={19} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.effectTitle}>Left / right balance</Text><Text style={styles.effectSub}>Stereo panning · Live processing</Text></View>
            <Text style={styles.valueText}>{balanceLabel}</Text>
          </View>
          <View
            style={styles.balanceTouch}
            onLayout={(event) => { railWidth.current = event.nativeEvent.layout.width; setBalanceWidth(event.nativeEvent.layout.width); }}
            {...panResponder.panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel="Stereo balance"
            accessibilityValue={{ min: -100, max: 100, now: Math.round(spatialBalance * 100) }}
          >
            <View style={styles.balanceRail}>
              <View style={styles.balanceCenter} />
              <View style={[styles.balanceThumb, { left: (((spatialBalance + 1) / 2) * 100).toFixed(2) + "%" as `${number}%` }]} />
            </View>
          </View>
          <View style={styles.balanceLabels}><Text style={styles.balanceLabel}>LEFT</Text><Text style={styles.balanceLabel}>CENTER</Text><Text style={styles.balanceLabel}>RIGHT</Text></View>
          <Pressable style={styles.resetButton} onPress={() => setSpatialBalance(0)}><Text style={styles.resetText}>Reset balance</Text></Pressable>
        </GlassSurface>

        <Text style={[styles.sectionTitle, styles.effectsHeading]}>Reverb</Text>
        <Text style={styles.sectionCopy}>Add generated room reflections to your audio. Each preset changes the decay and wet signal in the native audio graph.</Text>
        <GlassSurface style={styles.effectCard} contentStyle={styles.effectContent}>
          <View style={styles.effectTop}>
            <View style={styles.effectIcon}><Ionicons name="water-outline" size={19} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.effectTitle}>Space and ambience</Text><Text style={styles.effectSub}>Convolution reverb · Live processing</Text></View>
            <View style={styles.activePill}><Text style={styles.activePillText}>{reverbPreset.toUpperCase()}</Text></View>
          </View>
          <View style={styles.reverbOptions}>
            {REVERB_OPTIONS.map((option) => (
              <Pressable key={option.value} onPress={() => setReverbPreset(option.value)} style={[styles.reverbChip, reverbPreset === option.value && styles.reverbChipActive]}>
                <Text style={[styles.reverbText, reverbPreset === option.value && styles.reverbTextActive]}>{option.label}</Text>
                <Text style={styles.reverbDetail}>{option.detail}</Text>
              </Pressable>
            ))}
          </View>
        </GlassSurface>

        <GlassSurface style={styles.noteCard} contentStyle={styles.noteContent}>
          <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
          <Text style={styles.noteText}>
            {localPlayback
              ? "Effects are active on this imported local track. Your settings are saved on this device."
              : "Your effects settings are saved on this device. Processing options apply to imported local audio."}
          </Text>
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 15 },
  back: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 3 },
  content: { padding: 20, paddingTop: 4, paddingBottom: 36 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  sectionCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  choiceRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  choicePressable: { flex: 1 },
  choice: { flex: 1, minHeight: 128, borderRadius: 17 },
  choiceContent: { flex: 1, padding: 13, justifyContent: "space-between" },
  choiceActive: { borderColor: "rgba(255,255,255,0.34)", backgroundColor: "rgba(255,255,255,0.07)" },
  previewTrack: { height: 4, borderRadius: 4, backgroundColor: "#343642", marginTop: 8, marginBottom: 10, position: "relative" },
  previewFill: { width: "48%", height: 4, borderRadius: 4, backgroundColor: colors.accent },
  previewDot: { position: "absolute", width: 10, height: 10, borderRadius: 5, left: "48%", top: -3, marginLeft: -5, backgroundColor: colors.text },
  previewTrackClassic: { height: 8, borderRadius: 8, backgroundColor: "#343642", marginTop: 6, marginBottom: 8, position: "relative" },
  previewFillClassic: { width: "48%", height: 8, borderRadius: 8, backgroundColor: colors.accent },
  previewDotClassic: { position: "absolute", width: 14, height: 14, borderRadius: 7, left: "48%", top: -3, marginLeft: -7, backgroundColor: colors.text, borderWidth: 2, borderColor: colors.accent },
  choiceTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  choiceSub: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 3 },
  effectsHeading: { marginTop: 29 },
  effectCard: { borderRadius: 17, marginTop: 12 },
  effectContent: { padding: 15 },
  effectTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  effectIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  effectTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  effectSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  valueText: { color: colors.accent, fontSize: 9, fontWeight: "800" },
  balanceTouch: { height: 38, justifyContent: "center", marginTop: 12 },
  balanceRail: { height: 4, borderRadius: 4, backgroundColor: "#343642", position: "relative" },
  balanceCenter: { width: 1, height: 15, backgroundColor: colors.muted, position: "absolute", left: "50%", top: -5 },
  balanceThumb: { width: 15, height: 15, borderRadius: 8, backgroundColor: colors.text, borderWidth: 2, borderColor: colors.accent, position: "absolute", top: -5, marginLeft: -7.5 },
  balanceLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  balanceLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  resetButton: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 3, marginTop: 6 },
  resetText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  activePill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.07)" },
  activePillText: { color: colors.accent, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 },
  reverbOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 17 },
  reverbChip: { minWidth: "47%", flexGrow: 1, paddingHorizontal: 11, paddingVertical: 11, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: colors.border },
  reverbChipActive: { borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.09)" },
  reverbText: { color: colors.subtle, fontSize: 10, fontWeight: "800" },
  reverbTextActive: { color: colors.text },
  reverbDetail: { color: colors.subtle, fontSize: 8, marginTop: 4 },
  noteCard: { borderRadius: 14, marginTop: 18 },
  noteContent: { flexDirection: "row", gap: 9, padding: 13 },
  noteText: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 15 }
});
