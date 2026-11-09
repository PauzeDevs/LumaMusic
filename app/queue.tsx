import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../components/Artwork";
import { useAudioEngine } from "../providers/AudioPlayerProvider";
import { usePlayerStore } from "../store/player";
import { colors } from "../theme/colors";

export default function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const removeQueueItemAt = usePlayerStore((s) => s.removeQueueItemAt);
  const moveQueueTrack = usePlayerStore((s) => s.moveQueueTrack);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const { playTrack } = useAudioEngine();
  const currentIndex = usePlayerStore((s) => s.currentQueueIndex);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={23} color={colors.text} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR SESSION</Text><Text style={styles.title}>Up next</Text></View>
        <Pressable onPress={() => Alert.alert("Clear queue?", "This keeps the current track and removes everything after it.", [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: clearQueue }])} style={styles.clear}><Text style={styles.clearText}>Clear</Text></Pressable>
      </View>
      <Text style={styles.caption}>{queue.length} {queue.length === 1 ? "track" : "tracks"} in this queue</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {queue.map((track, index) => {
          const isCurrent = index === currentIndex;
          return (
            <View key={`${track.id}-${index}`} style={[styles.row, isCurrent && styles.current]}>
              <Artwork uri={track.artwork} size={48} radius={11} />
              <Pressable style={{ flex: 1 }} onPress={() => { void playTrack(track, queue, index).then(() => router.back()).catch((error: unknown) => Alert.alert("Playback failed", error instanceof Error ? error.message : "Try again.")); }}>
                <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.artist}>{isCurrent ? "CURRENT TRACK · " : ""}{track.artist}</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable disabled={index === 0} onPress={() => moveQueueTrack(index, index - 1)} style={styles.action}><Ionicons name="chevron-up" size={17} color={index === 0 ? colors.subtle : colors.muted} /></Pressable>
                <Pressable disabled={index === queue.length - 1} onPress={() => moveQueueTrack(index, index + 1)} style={styles.action}><Ionicons name="chevron-down" size={17} color={index === queue.length - 1 ? colors.subtle : colors.muted} /></Pressable>
                {!isCurrent ? <Pressable onPress={() => removeQueueItemAt(index)} style={styles.action}><Ionicons name="close" size={18} color={colors.muted} /></Pressable> : null}
              </View>
            </View>
          );
        })}
        {queue.length === 0 ? <Text style={styles.empty}>Your queue is empty. Find a track and start a new session.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 12 },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.7 },
  title: { color: colors.text, fontSize: 34, fontWeight: "700", letterSpacing: -1.2, marginTop: 5 },
  clear: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.surface },
  clearText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  caption: { color: colors.subtle, fontSize: 11, marginBottom: 14 },
  list: { paddingBottom: 28 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, padding: 10, borderRadius: 16, marginBottom: 5, backgroundColor: "rgba(255,255,255,0.035)" },
  current: { backgroundColor: "rgba(224,106,115,0.09)" },
  trackTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  artist: { color: colors.muted, fontSize: 10, marginTop: 4 },
  actions: { flexDirection: "row", alignItems: "center", gap: 1 },
  action: { width: 27, height: 32, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 50, fontSize: 12 }
});
