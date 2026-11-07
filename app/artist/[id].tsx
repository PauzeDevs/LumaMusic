import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { TrackRow } from "../../components/TrackRow";
import { colors } from "../../theme/colors";
import { getAudiusArtist, getAudiusArtistTracks } from "../../services/audius";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artistQuery = useQuery({ queryKey: ["audius", "artist", id], queryFn: () => getAudiusArtist(id), enabled: Boolean(id) });
  const tracksQuery = useQuery({ queryKey: ["audius", "artist-tracks", id], queryFn: () => getAudiusArtistTracks(id, 30, 0), enabled: Boolean(id) });
  const artist = artistQuery.data;
  const tracks = tracksQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={styles.backText}>Back</Text></Pressable>
        {artistQuery.isLoading ? <Text style={styles.message}>Loading artist…</Text> : null}
        {artistQuery.error ? <Text style={styles.error}>{artistQuery.error instanceof Error ? artistQuery.error.message : "Could not load artist details."}</Text> : null}
        {!artistQuery.isLoading && !artistQuery.error && !artist ? <Text style={styles.message}>This artist could not be found.</Text> : null}
        {artist ? (
          <View style={styles.hero}>
            <Artwork uri={artist.artwork} size={116} radius={58} />
            <Text style={styles.name}>{artist.name}</Text>
            <Text style={styles.handle}>{artist.handle ? "@" + artist.handle : "Audius artist"}</Text>
            <Text style={styles.stats}>{artist.followerCount.toLocaleString()} followers · {artist.trackCount.toLocaleString()} tracks</Text>
            {artist.bio ? <Text style={styles.bio}>{artist.bio}</Text> : null}
          </View>
        ) : null}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          <Text style={styles.count}>{tracks.length}</Text>
        </View>
        {tracksQuery.isLoading ? <Text style={styles.message}>Loading tracks…</Text> : null}
        {tracksQuery.error ? <Text style={styles.error}>{tracksQuery.error instanceof Error ? tracksQuery.error.message : "Could not load artist tracks."}</Text> : null}
        {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
        {!tracksQuery.isLoading && tracks.length === 0 ? <Text style={styles.message}>No public tracks are available for this artist.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12 },
  backText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  hero: { alignItems: "center", paddingVertical: 26, gap: 7 },
  name: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 8 },
  handle: { color: colors.accent, fontSize: 12 },
  stats: { color: colors.muted, fontSize: 11, marginTop: 2 },
  bio: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  count: { color: colors.subtle, fontSize: 11 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  error: { color: colors.danger, fontSize: 12, paddingVertical: 14 }
});