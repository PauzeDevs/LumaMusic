import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { TrackRow } from "../../components/TrackRow";
import { getYouTubeMusicReleaseTracks } from "../../services/youtubeMusic";
import { useTheme } from "../../theme/useTheme";

export default function ReleaseScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ id: string; title?: string; artwork?: string; kind?: string }>();
  const browseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const artwork = Array.isArray(params.artwork) ? params.artwork[0] : params.artwork;
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const query = useQuery({
    queryKey: ["youtubeMusic", "release", browseId],
    queryFn: () => getYouTubeMusicReleaseTracks(browseId ?? "", 100),
    enabled: Boolean(browseId),
    staleTime: 5 * 60_000
  });
  const tracks = query.data ?? [];

  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <View style={styles.hero}>
        <Artwork uri={artwork ?? ""} size={210} radius={20} />
        <Text style={styles.eyebrow}>{(kind || "release").toUpperCase()}</Text>
        <Text style={styles.title}>{title || "Release"}</Text>
        <Text style={styles.copy}>{query.isLoading ? "Loading tracklist…" : tracks.length + (tracks.length === 1 ? " track" : " tracks")}</Text>
      </View>
      {query.isLoading ? <View style={styles.state}><Ionicons name="musical-notes" size={24} color={colors.accent} /><Text style={styles.stateCopy}>Loading this release…</Text></View> : null}
      {query.isError ? <Pressable onPress={() => query.refetch()} style={styles.state}><Ionicons name="refresh" size={24} color={colors.accent} /><Text style={styles.stateTitle}>Couldn't load the tracklist</Text><Text style={styles.stateCopy}>Tap to try again</Text></Pressable> : null}
      {!query.isLoading && !query.isError && tracks.length === 0 ? <View style={styles.state}><Text style={styles.stateCopy}>No tracks were found for this release.</Text></View> : null}
      {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
    </ScrollView>
  </SafeAreaView>;
}

function createStyles(c: ReturnType<typeof useTheme>["colors"]) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 20, paddingBottom: 38 },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12 },
  backText: { color: c.muted, fontSize: 12 },
  hero: { alignItems: "center", paddingTop: 18, paddingBottom: 25, gap: 9 },
  eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 6 },
  title: { color: c.text, fontSize: 25, fontWeight: "800", textAlign: "center" },
  copy: { color: c.muted, fontSize: 11 },
  state: { minHeight: 140, alignItems: "center", justifyContent: "center", gap: 9 },
  stateTitle: { color: c.text, fontSize: 14, fontWeight: "800" },
  stateCopy: { color: c.muted, fontSize: 11, textAlign: "center" }
}); }
