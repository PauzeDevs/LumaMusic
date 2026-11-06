import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Image, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { usePlayerStore } from "../store/player";

function formatTime(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

export default function NowPlayingScreen() {
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const queue = usePlayerStore((s) => s.queue);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrevious = usePlayerStore((s) => s.playPrevious);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleLike = usePlayerStore((s) => s.toggleLike);

  if (!track) {
    return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Choose a track to start listening.</Text></SafeAreaView>;
  }

  const liked = likedTrackIds.includes(track.id);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-down" size={24} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.overline}>NOW PLAYING</Text><Text style={styles.headerTitle}>From your discovery</Text></View>
        <Pressable onPress={() => Alert.alert("Track options", "More track actions will be added with the Audius integration.")} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={22} color={colors.text} /></Pressable>
      </View>
      <View style={styles.main}>
        <View style={styles.artFrame}>
          <Image source={{ uri: track.artwork }} style={styles.artwork} />
        </View>
        <View style={styles.trackInfo}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
          </View>
          <Pressable style={styles.like} onPress={() => toggleLike(track.id)}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={colors.accent} />
          </Pressable>
        </View>
        <View style={styles.progressArea}>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          <View style={styles.timeRow}><Text style={styles.time}>0:00</Text><Text style={styles.time}>{formatTime(track.durationMs)}</Text></View>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle}><Ionicons name="shuffle" size={22} color={isShuffled ? colors.accent : colors.muted} /></Pressable>
          <Pressable onPress={playPrevious}><Ionicons name="play-skip-back" size={27} color={colors.text} /></Pressable>
          <Pressable style={styles.play} onPress={togglePlayback}><Ionicons name={isPlaying ? "pause" : "play"} size={29} color="#17111F" /></Pressable>
          <Pressable onPress={playNext}><Ionicons name="play-skip-forward" size={27} color={colors.text} /></Pressable>
          <Pressable onPress={cycleRepeat}><Ionicons name={repeatMode === "one" ? "repeat" : "repeat"} size={22} color={repeatMode === "off" ? colors.muted : colors.accent} /></Pressable>
        </View>
      </View>
      <View style={styles.bottom}>
        <Pressable style={styles.bottomAction} onPress={() => Alert.alert("Up next", queue.map((item, index) => (index + 1) + ". " + item.title + " · " + item.artist).join("\n") || "Your queue is empty.")}>
          <Ionicons name="list" size={20} color={colors.muted} /><Text style={styles.bottomText}>Queue</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => Share.share({ message: track.title + " by " + track.artist + " · LumaMusic" })}>
          <Ionicons name="share-social-outline" size={20} color={colors.muted} /><Text style={styles.bottomText}>Share</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => Alert.alert("Audio devices", "Bluetooth and device routing controls will be connected with the native audio engine.")}>
          <Ionicons name="airplay" size={20} color={colors.muted} /><Text style={styles.bottomText}>Connect</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>UI prototype · Sample track · No audio stream connected yet</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 22 },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerCopy: { alignItems: "center", gap: 3 },
  overline: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.7 },
  headerTitle: { color: colors.muted, fontSize: 11 },
  main: { flex: 1, justifyContent: "center" },
  artFrame: { width: "100%", aspectRatio: 1, borderRadius: 25, overflow: "hidden", backgroundColor: colors.surfaceElevated, marginBottom: 30 },
  artwork: { width: "100%", height: "100%" },
  trackInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  trackTitle: { color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: -0.6 },
  artist: { color: colors.muted, fontSize: 14, marginTop: 5 },
  like: { padding: 8 },
  progressArea: { marginTop: 28 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: "#292C38", overflow: "hidden" },
  progressFill: { width: "22%", height: 4, backgroundColor: colors.accent, borderRadius: 4 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { color: colors.subtle, fontSize: 10, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  play: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  bottom: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 15 },
  bottomAction: { flexDirection: "row", alignItems: "center", gap: 7 },
  bottomText: { color: colors.muted, fontSize: 11 },
  disclaimer: { color: colors.subtle, textAlign: "center", fontSize: 9, paddingBottom: 10 },
  empty: { color: colors.text, textAlign: "center", marginTop: 80 }
});