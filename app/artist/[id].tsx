import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { TrackRow } from "../../components/TrackRow";
import type { ThemePalette } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";
import { getYouTubeMusicArtistTracks, getYouTubeMusicArtistReleases, type MusicRelease } from "../../services/youtubeMusic";

export default function ArtistScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { id, name, artwork } = useLocalSearchParams<{ id: string; name?: string; artwork?: string }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const artistName = Array.isArray(name) ? name[0] : name;
  const artistArtwork = Array.isArray(artwork) ? artwork[0] : artwork;
  const tracksQuery = useQuery({
    queryKey: ["youtubeMusic", "artist", artistId],
    queryFn: () => getYouTubeMusicArtistTracks(artistId ?? "", 40),
    enabled: Boolean(artistId?.startsWith("UC")),
    staleTime: 60_000
  });
  const tracks = tracksQuery.data ?? [];
  const releasesQuery = useQuery({ queryKey: ["youtubeMusic", "artistReleases", artistId], queryFn: () => getYouTubeMusicArtistReleases(artistId ?? "", 40), enabled: Boolean(artistId?.startsWith("UC")), staleTime: 5 * 60_000 });
  const releases = releasesQuery.data ?? [];
  const albums = releases.filter((release) => release.kind === "album");
  const eps = releases.filter((release) => release.kind === "ep");
  const singles = releases.filter((release) => release.kind === "single");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Artwork uri={artistArtwork ?? ""} size={148} radius={74} />
          <Text style={styles.eyebrow}>ARTIST</Text>
          <Text style={styles.title}>{artistName || "Artist"}</Text>
          <Text style={styles.copy}>Explore tracks and play them without leaving LumaMusic.</Text>
        </View>

        {releasesQuery.isLoading ? <View style={styles.releaseLoading}><ActivityIndicator color={colors.accent} /><Text style={styles.stateCopy}>Finding albums and EPs…</Text></View> : null}
        {releasesQuery.isError ? <Pressable onPress={() => releasesQuery.refetch()} style={styles.releaseRetry}><Text style={styles.retryText}>Couldn't load releases · Tap to retry</Text></Pressable> : null}
        {albums.length > 0 ? <ReleaseShelf title="Albums" releases={albums} colors={colors} onOpen={(release) => router.push({ pathname: "/release/[id]", params: { id: release.browseId, title: release.title, artwork: release.artwork, kind: release.kind } })} /> : null}
        {eps.length > 0 ? <ReleaseShelf title="EPs" releases={eps} colors={colors} onOpen={(release) => router.push({ pathname: "/release/[id]", params: { id: release.browseId, title: release.title, artwork: release.artwork, kind: release.kind } })} /> : null}
        {singles.length > 0 ? <ReleaseShelf title="Singles" releases={singles} colors={colors} onOpen={(release) => router.push({ pathname: "/release/[id]", params: { id: release.browseId, title: release.title, artwork: release.artwork, kind: release.kind } })} /> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular tracks</Text>
          {!tracksQuery.isLoading && tracks.length > 0 ? <Text style={styles.count}>{tracks.length} tracks</Text> : null}
        </View>

        {tracksQuery.isLoading ? (
          <View style={styles.state}>
            <Ionicons name="musical-notes" size={23} color={colors.accent} />
            <Text style={styles.stateTitle}>Finding tracks</Text>
            <Text style={styles.stateCopy}>Loading this artist's catalogue…</Text>
          </View>
        ) : null}
        {tracksQuery.isError ? (
          <View style={styles.state}>
            <Ionicons name="cloud-offline-outline" size={23} color={colors.danger} />
            <Text style={styles.stateTitle}>Couldn't load this artist</Text>
            <Text style={styles.stateCopy}>{tracksQuery.error instanceof Error ? tracksQuery.error.message : "Please try again."}</Text>
            <Pressable onPress={() => tracksQuery.refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {!tracksQuery.isLoading && !tracksQuery.isError && tracks.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="albums-outline" size={23} color={colors.subtle} />
            <Text style={styles.stateTitle}>No tracks found</Text>
            <Text style={styles.stateCopy}>This artist's catalogue isn't available right now.</Text>
          </View>
        ) : null}
        {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12 },
  backText: { color: colors.muted, fontSize: 12 },
  hero: { alignItems: "center", paddingTop: 22, paddingBottom: 28, gap: 10 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 8 },
  title: { color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.7, textAlign: "center" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 270 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 11, marginBottom: 7 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  count: { color: colors.subtle, fontSize: 10, fontWeight: "700" },
  releaseLoading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 22 },
  releaseRetry: { paddingVertical: 14, alignItems: "center" },
  state: { minHeight: 170, alignItems: "center", justifyContent: "center", padding: 22, gap: 9 },
  stateTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  stateCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  retry: { marginTop: 5, paddingHorizontal: 17, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.accent },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }
}); }


function ReleaseShelf({ title, releases, colors, onOpen }: { title: string; releases: MusicRelease[]; colors: ThemePalette; onOpen: (release: MusicRelease) => void }) {
  return <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: colors.subtle, fontSize: 10, fontWeight: "700" }}>{releases.length} releases</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 13, paddingRight: 20 }}>
      {releases.map((release) => <Pressable key={release.id} onPress={() => onOpen(release)} style={{ width: 142 }}>
        <Artwork uri={release.artwork} size={142} radius={15} />
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 9 }}>{release.title}</Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{release.subtitle}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}
