import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { TrackRow } from "../components/TrackRow";
import { useLibraryStore } from "../store/library";
import { useTheme } from "../theme/useTheme";
import { useAudioEngine } from "../providers/AudioPlayerProvider";

export default function LikedSongsScreen() {
  const { colors } = useTheme();
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const { playTrack } = useAudioEngine();

  return (
    <SafeAreaView style={makeStyles(colors).safe} edges={["top"]}>
      <View style={makeStyles(colors).header}>
        <Pressable onPress={() => router.back()} style={makeStyles(colors).back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={23} color={colors.text} />
        </Pressable>
        <View style={makeStyles(colors).heading}>
          <Text style={makeStyles(colors).eyebrow}>YOUR COLLECTION</Text>
          <Text style={makeStyles(colors).title}>Liked songs</Text>
          <Text style={makeStyles(colors).subtitle}>{likedTracks.length} {likedTracks.length === 1 ? "song" : "songs"} you love</Text>
        </View>
      </View>
      {likedTracks.length ? (
        <FlatList
          data={likedTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={makeStyles(colors).list}
          renderItem={({ item, index }) => (
            <TrackRow track={item} index={index} showIndex queue={likedTracks} />
          )}
        />
      ) : (
        <View style={makeStyles(colors).empty}>
          <View style={makeStyles(colors).heart}><Ionicons name="heart-outline" size={32} color={colors.accent} /></View>
          <Text style={makeStyles(colors).emptyTitle}>Nothing liked yet</Text>
          <Text style={makeStyles(colors).emptyText}>Tap the heart on any song and it’ll be waiting here.</Text>
          <Pressable onPress={() => router.push("/(tabs)/search")} style={makeStyles(colors).discover}>
            <Text style={makeStyles(colors).discoverText}>Discover music</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
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
