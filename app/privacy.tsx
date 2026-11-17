import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../store/library";
import { useListeningStatsStore } from "../store/listeningStats";
import { useTheme } from "../theme/useTheme";

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const clearStats = useListeningStatsStore((state) => state.clearStats);
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View><Text style={styles.eyebrow}>YOUR DATA, YOUR CHOICE</Text><Text style={styles.title}>Privacy & data</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.info}>
          <Ionicons name="shield-checkmark-outline" size={25} color={colors.accent} />
          <Text style={styles.copy}>Manage the listening history and library data stored by LumaMusic on this device. Opening this page never deletes anything.</Text>
        </View>
        <Text style={styles.section}>Listening history</Text>
        <Text style={styles.description}>Remove recorded listening sessions, daily totals and top-track statistics from this device.</Text>
        <Pressable style={styles.action} onPress={() => Alert.alert("Clear listening history?", "This permanently removes listening statistics stored on this device. Your liked songs and playlists will remain.", [{ text: "Cancel", style: "cancel" }, { text: "Clear history", style: "destructive", onPress: clearStats }])}>
          <Ionicons name="time-outline" size={19} color={colors.accent} /><Text style={styles.actionText}>Clear listening history</Text><Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </Pressable>
        <Text style={styles.section}>Library data</Text>
        <Text style={styles.description}>Remove liked songs, recently played tracks, local track references and playlists from the LumaMusic library on this device.</Text>
        <Pressable style={styles.action} onPress={() => Alert.alert("Clear library data?", "This removes liked songs, recently played tracks, local track references and playlists. It does not delete imported audio files from device storage or remove an existing Google Drive backup.", [{ text: "Cancel", style: "cancel" }, { text: "Clear library", style: "destructive", onPress: () => useLibraryStore.getState().clearLibrary() }])}>
          <Ionicons name="library-outline" size={19} color={colors.accent} /><Text style={styles.actionText}>Clear library data</Text><Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </Pressable>
        <Text style={styles.note}>Google Drive backups are managed separately from Account settings. Clearing local data does not delete an existing cloud backup.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
    title: { color: c.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
    content: { padding: 20, paddingBottom: 40 },
    info: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    copy: { color: c.muted, flex: 1, fontSize: 12, lineHeight: 19 },
    section: { color: c.text, fontSize: 16, fontWeight: "800", marginTop: 28, marginBottom: 6 },
    description: { color: c.muted, fontSize: 11, lineHeight: 18, marginBottom: 12 },
    action: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
    actionText: { color: c.text, fontSize: 12, fontWeight: "700", flex: 1 },
    note: { color: c.subtle, fontSize: 10, lineHeight: 16, marginTop: 24 }
  });
}
