import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { TrackRow } from "../components/TrackRow";
import { useLibraryStore } from "../store/library";
import { colors } from "../theme/colors";
import { useAudioEngine } from "../providers/AudioPlayerProvider";

export default function LikedSongsScreen() {
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const { playTrack } = useAudioEngine();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
          <Text style={styles.title}>Liked songs</Text>
          <Text style={styles.subtitle}>{likedTracks.length} {likedTracks.length === 1 ? "song" : "songs"} you love</Text>
        </View>
      </View>
      {likedTracks.length ? (
        <FlatList
          data={likedTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <TrackRow track={item} index={index} showIndex queue={likedTracks} />
          )}
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.heart}><Ionicons name="heart-outline" size={32} color={colors.accent} /></View>
          <Text style={styles.emptyTitle}>Nothing liked yet</Text>
          <Text style={styles.emptyText}>Tap the heart on any song and it’ll be waiting here.</Text>
          <Pressable onPress={() => router.push("/(tabs)/search")} style={styles.discover}>
            <Text style={styles.discoverText}>Discover music</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingTop: 12, paddingBottom: 24 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  heading: { flex: 1, gap: 4 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.7 },
  title: { color: colors.text, fontSize: 29, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 12 },
  list: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 70 },
  heart: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 8 },
  discover: { marginTop: 20, backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  discoverText: { color: "#17111F", fontSize: 12, fontWeight: "800" }
});
