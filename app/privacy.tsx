import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { useLibraryStore } from "../store/library";
import { useListeningStatsStore } from "../store/listeningStats";
import { useTheme } from "../theme/useTheme";

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const likedCount = useLibraryStore((state) => state.likedTracks.length);
  const historyCount = useLibraryStore((state) => state.recentTracks.length);
  const localCount = useLibraryStore((state) => state.localTracks.length);
  const playlistCount = useLibraryStore((state) => state.playlists.length);

  const confirmClearLibrary = () => Alert.alert(
    "Clear this device's library?",
    "This permanently removes LumaMusic data from this device:\n\n• Liked tracks and playlists\n• Recent listening history\n• Listening statistics and play counts\n• Imported local-track entries\n\nThis does not delete audio files from your device or remove a Google Drive backup. This action cannot be undone.",
    [
      { text: "Keep my library", style: "cancel" },
      { text: "Clear library and stats", style: "destructive", onPress: () => {
        useLibraryStore.getState().clearLibrary();
        useListeningStatsStore.getState().clearStats();
      } }
    ]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>YOUR DATA, YOUR CHOICE</Text>
          <Text style={styles.title}>Privacy</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark-outline" size={30} color={colors.accent} /></View>
        <Text style={styles.heroTitle}>Your listening data stays yours.</Text>
        <Text style={styles.copy}>Review what LumaMusic keeps on this device and manage your library or cloud backup separately.</Text>

        <Text style={styles.sectionTitle}>ON THIS DEVICE</Text>
        <GlassSurface style={styles.panel} contentStyle={styles.dataPanel}>
          <DataRow icon="heart-outline" title="Liked tracks" count={likedCount} colors={colors} />
          <DataRow icon="time-outline" title="Listening history" count={historyCount} colors={colors} />
          <DataRow icon="folder-outline" title="Imported track entries" count={localCount} colors={colors} />
          <DataRow icon="musical-notes-outline" title="Playlists" count={playlistCount} colors={colors} last />
        </GlassSurface>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={17} color={colors.accent} />
          <Text style={styles.noteText}>Your library is stored locally by LumaMusic. Imported track entries are references to audio files; clearing the library does not erase those files.</Text>
        </View>

        <Text style={styles.sectionTitle}>CLOUD BACKUP</Text>
        <Pressable onPress={() => router.push("/account")} style={styles.actionRow}>
          <View style={styles.actionIcon}><Ionicons name="cloud-outline" size={19} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Google Drive backup</Text>
            <Text style={styles.actionSub}>Review your connected account and backup controls</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </Pressable>

        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        <Pressable onPress={confirmClearLibrary} style={styles.dangerRow}>
          <View style={styles.dangerIcon}><Ionicons name="trash-outline" size={19} color={colors.danger ?? "#E05A67"} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>Clear local data</Text>
            <Text style={styles.actionSub}>Remove your library, listening history and listening statistics from this device</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </Pressable>
        <Text style={styles.footer}>Opening Privacy never changes or deletes your data. Destructive actions always require confirmation.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DataRow({ icon, title, count, colors, last = false }: { icon: string; title: string; count: number; colors: ReturnType<typeof useTheme>["colors"]; last?: boolean }) {
  return (
    <View style={[makeStyles(colors).dataRow, last && makeStyles(colors).last]}>
      <Ionicons name={icon as never} size={18} color={colors.muted} />
      <Text style={makeStyles(colors).dataTitle}>{title}</Text>
      <Text style={makeStyles(colors).count}>{count}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
    title: { color: c.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.7, marginTop: 2 },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
    heroIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: c.surfaceSoft, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 17 },
    heroTitle: { color: c.text, fontSize: 23, lineHeight: 29, fontWeight: "800", letterSpacing: -0.6 },
    copy: { color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 8, marginBottom: 25 },
    sectionTitle: { color: c.subtle, fontSize: 9, fontWeight: "800", letterSpacing: 1.5, marginBottom: 10, marginTop: 8 },
    panel: { borderRadius: 19 },
    dataPanel: { paddingHorizontal: 15 },
    dataRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    last: { borderBottomWidth: 0 },
    dataTitle: { flex: 1, color: c.text, fontSize: 12, fontWeight: "600" },
    count: { color: c.muted, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 13, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginTop: 12, marginBottom: 22 },
    noteText: { flex: 1, color: c.muted, fontSize: 10, lineHeight: 16 },
    actionRow: { minHeight: 76, paddingHorizontal: 13, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
    actionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    actionTitle: { color: c.text, fontSize: 12, fontWeight: "700" },
    actionSub: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
    dangerRow: { minHeight: 80, paddingHorizontal: 13, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: "row", alignItems: "center", gap: 12 },
    dangerIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(224,90,103,0.12)", alignItems: "center", justifyContent: "center" },
    dangerTitle: { color: "#E05A67", fontSize: 12, fontWeight: "700" },
    footer: { color: c.subtle, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 20, paddingHorizontal: 10 }
  });
}
