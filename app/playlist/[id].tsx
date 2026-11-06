import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { TrackRow } from "../../components/TrackRow";
import { colors } from "../../theme/colors";
import { getAudiusPlaylist, getAudiusPlaylistTracks } from "../../services/audius";

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistQuery = useQuery({ queryKey: ["audius", "playlist", id], queryFn: () => getAudiusPlaylist(id), enabled: Boolean(id) });
  const tracksQuery = useQuery({ queryKey: ["audius", "playlist-tracks", id], queryFn: () => getAudiusPlaylistTracks(id, 50, 0), enabled: Boolean(id) });
  const playlist = playlistQuery.data;
  const tracks = tracksQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={styles.backText}>Back</Text></Pressable>
        {playlistQuery.isLoading ? <Text style={styles.message}>Loading playlist…</Text> : null}
        {playlist ? (
          <View style={styles.hero}>
            <Artwork uri={playlist.artwork} size={190} radius={22} />
            <Text style={styles.name}>{playlist.title}</Text>
            <Text style={styles.creator}>{playlist.subtitle}</Text>
            <Text style={styles.stats}>{playlist.trackCount ?? tracks.length} tracks · Audius playlist</Text>
          </View>
        ) : null}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tracklist</Text>
          <Text style={styles.count}>{tracks.length}</Text>
        </View>
        {tracksQuery.isLoading ? <Text style={styles.message}>Loading tracks…</Text> : null}
        {tracksQuery.error ? <Text style={styles.error}>{tracksQuery.error instanceof Error ? tracksQuery.error.message : "Could not load playlist tracks."}</Text> : null}
        {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
        {!tracksQuery.isLoading && tracks.length === 0 ? <Text style={styles.message}>This playlist has no publicly available tracks.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12 },
  backText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  hero: { alignItems: "center", paddingVertical: 22, gap: 7 },
  name: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 8, textAlign: "center" },
  creator: { color: colors.accent, fontSize: 12 },
  stats: { color: colors.muted, fontSize: 11, marginTop: 2 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  count: { color: colors.subtle, fontSize: 11 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  error: { color: colors.danger, fontSize: 12, paddingVertical: 14 }
});