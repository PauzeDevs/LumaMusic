import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { PageEntrance } from "../../components/PageEntrance";
import { AlbumArtwork } from "../../components/AlbumArtwork";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { TrackRow } from "../../components/TrackRow";
import { GlassSurface } from "../../components/GlassSurface";
import { GlassActionPill } from "../../components/GlassPills";
import { Alert } from "react-native";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { getYouTubeMusicReleaseTracks } from "../../services/youtubeMusic";
import { useTheme } from "../../theme/useTheme";

export default function ReleaseScreen() {
  const { colors } = useTheme();
  const { playTrack } = useAudioEngine();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id: string; title?: string; artwork?: string; kind?: string; artist?: string }>();
  const browseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const artwork = Array.isArray(params.artwork) ? params.artwork[0] : params.artwork;
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const artist = Array.isArray(params.artist) ? params.artist[0] : params.artist;
  const query = useQuery({
    queryKey: ["youtubeMusic", "release", browseId],
    queryFn: () => getYouTubeMusicReleaseTracks(browseId ?? "", 100, { artist, artwork }),
    enabled: Boolean(browseId),
    staleTime: 5 * 60_000
  });
  const tracks = query.data ?? [];
  const playRelease = () => {
    if (!tracks.length) return;
    playTrack(tracks[0], tracks).catch((error: unknown) => Alert.alert("Couldn't start release", error instanceof Error ? error.message : "Please try again."));
  };

  return <PageEntrance><SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <GlassSurface style={styles.hero} contentStyle={styles.heroContent}>
        <AlbumArtwork uri={artwork ?? ""} size={210} radius={20} />
        <Text style={styles.eyebrow}>{(kind || "release").toUpperCase()}</Text>
        <Text style={styles.title}>{title || "Release"}</Text>
        {artist ? <Text style={styles.artist}>{artist}</Text> : null}
        <Text style={styles.copy}>{query.isLoading ? "Loading tracklist…" : tracks.length + (tracks.length === 1 ? " track" : " tracks")}</Text>
        <View style={styles.heroActions}><GlassActionPill icon="play" label="Play release" onPress={playRelease} active /></View>
      </GlassSurface>
      {query.isLoading ? <View style={styles.state}><Ionicons name="musical-notes" size={24} color={colors.accent} /><Text style={styles.stateCopy}>Loading this release…</Text></View> : null}
      {query.isError ? <Pressable onPress={() => query.refetch()} style={styles.state}><Ionicons name="refresh" size={24} color={colors.accent} /><Text style={styles.stateTitle}>Couldn't load the tracklist</Text><Text style={styles.stateCopy}>Tap to try again</Text></Pressable> : null}
      {!query.isLoading && !query.isError && tracks.length === 0 ? <View style={styles.state}><Text style={styles.stateCopy}>No tracks were found for this release.</Text></View> : null}
      {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
    </ScrollView>
  </SafeAreaView></PageEntrance>;
}

function createStyles(c: ReturnType<typeof useTheme>["colors"]) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 20, paddingBottom: 38 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12 },
  backText: { color: c.muted, fontSize: 12 },
  hero: { marginTop: 10, marginBottom: 20, borderRadius: 24 },
  heroContent: { alignItems: "center", paddingTop: 20, paddingBottom: 24, paddingHorizontal: 18, gap: 9 },
  heroActions: { marginTop: 4 },
  eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 6 },
  title: { color: c.text, fontSize: 25, fontWeight: "800", textAlign: "center" },
  artist: { color: c.muted, fontSize: 14, fontWeight: "700", textAlign: "center" },
  copy: { color: c.muted, fontSize: 11 },
  state: { minHeight: 140, alignItems: "center", justifyContent: "center", gap: 9 },
  stateTitle: { color: c.text, fontSize: 14, fontWeight: "800" },
  stateCopy: { color: c.muted, fontSize: 11, textAlign: "center" }
}); }
