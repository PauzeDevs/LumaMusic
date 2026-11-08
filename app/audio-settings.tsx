import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { usePlayerStore } from "../store/player";
import { usePreferencesStore } from "../store/preferences";
import { colors } from "../theme/colors";

export default function AudioSettingsScreen() {
  const progressBarStyle = usePreferencesStore((state) => state.progressBarStyle);
  const setProgressBarStyle = usePreferencesStore((state) => state.setProgressBarStyle);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const externalPlayback = currentTrack?.source === "youtube_music";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View><Text style={styles.eyebrow}>PERSONALISE YOUR SOUND</Text><Text style={styles.title}>Audio settings</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Playback appearance</Text>
        <Text style={styles.sectionCopy}>Choose how the duration bar looks when LumaMusic owns playback. External players keep their own controls.</Text>
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
        <Text style={[styles.sectionTitle, styles.effectsHeading]}>Audio effects</Text>
        <Text style={styles.sectionCopy}>These need LumaMusic to own the audio signal. The current music catalogue opens tracks in YouTube Music, so external audio cannot be processed here.</Text>
        <GlassSurface style={styles.effectCard} contentStyle={styles.effectContent}>
          <View style={styles.effectTop}>
            <View style={styles.effectIcon}><Ionicons name="headset-outline" size={19} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.effectTitle}>Spatial balance · L / R speakers</Text><Text style={styles.effectSub}>Left/right stereo channel balance</Text></View>
            <View style={styles.unavailable}><Text style={styles.unavailableText}>UNAVAILABLE</Text></View>
          </View>
          <View style={styles.balanceRail}><View style={styles.balanceCenter} /><View style={styles.balanceDot} /></View>
          <View style={styles.balanceLabels}><Text style={styles.balanceLabel}>LEFT</Text><Text style={styles.balanceLabel}>CENTER</Text><Text style={styles.balanceLabel}>RIGHT</Text></View>
        </GlassSurface>
        <GlassSurface style={styles.effectCard} contentStyle={styles.effectContent}>
          <View style={styles.effectTop}>
            <View style={styles.effectIcon}><Ionicons name="water-outline" size={19} color={colors.accent} /></View>
            <View style={{ flex: 1 }}><Text style={styles.effectTitle}>Reverb</Text><Text style={styles.effectSub}>Room ambience and hall depth</Text></View>
            <View style={styles.unavailable}><Text style={styles.unavailableText}>UNAVAILABLE</Text></View>
          </View>
          <View style={styles.reverbOptions}>
            {["Off", "Room", "Studio", "Hall"].map((label) => <View key={label} style={styles.reverbChip}><Text style={styles.reverbText}>{label}</Text></View>)}
          </View>
          <Text style={styles.effectFootnote}>{externalPlayback ? "This track is controlled by the external player." : "An in-app audio source is required before effects can be enabled."}</Text>
        </GlassSurface>
        <GlassSurface style={styles.noteCard} contentStyle={styles.noteContent}>
          <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
          <Text style={styles.noteText}>Your progress-bar choice is saved on this device for LumaMusic-controlled playback. The current YouTube Music handoff keeps its own seek bar. Reverb and stereo processing remain unavailable until a native in-app audio source is connected.</Text>
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
  effectIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(198,167,255,0.09)", alignItems: "center", justifyContent: "center" },
  effectTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  effectSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  unavailable: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  unavailableText: { color: colors.subtle, fontSize: 7, fontWeight: "800", letterSpacing: 0.8 },
  balanceRail: { height: 4, borderRadius: 4, backgroundColor: "#343642", marginTop: 22, position: "relative" },
  balanceCenter: { width: 1, height: 13, backgroundColor: colors.muted, position: "absolute", left: "50%", top: -4 },
  balanceDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.subtle, position: "absolute", left: "50%", top: -4, marginLeft: -6 },
  balanceLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  balanceLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  reverbOptions: { flexDirection: "row", gap: 7, marginTop: 17 },
  reverbChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: colors.border },
  reverbText: { color: colors.subtle, fontSize: 9, fontWeight: "700" },
  effectFootnote: { color: colors.subtle, fontSize: 9, lineHeight: 14, marginTop: 12 },
  noteCard: { borderRadius: 14, marginTop: 18 },
  noteContent: { flexDirection: "row", gap: 9, padding: 13 },
  noteText: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 15 }
});