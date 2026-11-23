import { useRef } from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { PageEntrance } from "../../components/PageEntrance";
import { AlbumArtwork } from "../../components/AlbumArtwork";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrackRow } from "../../components/TrackRow";
import type { ThemePalette } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";
import { getYouTubeMusicArtistTracks, getYouTubeMusicArtistReleases, type MusicRelease } from "../../services/youtubeMusic";
import { usePreferencesStore } from "../../store/preferences";

export default function ArtistScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { id, name, artwork } = useLocalSearchParams<{ id: string; name?: string; artwork?: string }>();
  const artistId = Array.isArray(id) ? id[0] : id;
  const artistName = Array.isArray(name) ? name[0] : name;
  const artistArtwork = Array.isArray(artwork) ? artwork[0] : artwork;
  const tracksQuery = useQuery({
    queryKey: ["youtubeMusic", "artist", artistId],
    queryFn: () => getYouTubeMusicArtistTracks(artistId ?? "", 120),
    enabled: Boolean(artistId?.startsWith("UC")),
    staleTime: 60_000
  });
  const tracks = tracksQuery.data ?? [];
  const releasesQuery = useQuery({
    queryKey: ["youtubeMusic", "artistReleases", artistId],
    queryFn: () => getYouTubeMusicArtistReleases(artistId ?? "", 120),
    enabled: Boolean(artistId?.startsWith("UC")),
    staleTime: 5 * 60_000
  });
  const releases = releasesQuery.data ?? [];
  const albums = releases.filter((release) => release.kind === "album");
  const eps = releases.filter((release) => release.kind === "ep");
  const singles = releases.filter((release) => release.kind === "single");

  const openRelease = (release: MusicRelease) => router.push({
    pathname: "/release/[id]",
    params: {
      id: release.browseId,
      title: release.title,
      artwork: release.artwork,
      kind: release.kind,
      artist: artistName || ""
    }
  });

  return (
    <PageEntrance>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <FlatList
          data={tracks}
          keyExtractor={(track) => track.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <>
              <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
                <View style={styles.backIcon}>
                  <Ionicons name="chevron-back" size={19} color={colors.text} />
                </View>
                <Text style={styles.backText}>Back to music</Text>
              </Pressable>

              <View style={styles.hero}>
                <View style={styles.heroTopline}>
                  <View style={styles.artistTag}>
                    <View style={styles.artistDot} />
                    <Text style={styles.eyebrow}>ARTIST PROFILE</Text>
                  </View>
                  <Ionicons name="musical-notes" size={18} color={colors.subtle} />
                </View>
                <AlbumArtwork uri={artistArtwork ?? ""} size={148} radius={74} />
                <Text style={styles.title}>{artistName || "Artist"}</Text>
                <Text style={styles.copy}>Your space for the music, albums and releases from this artist.</Text>
                <View style={styles.heroStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{tracksQuery.isLoading ? "—" : tracks.length}</Text>
                    <Text style={styles.statLabel}>TRACKS</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{releasesQuery.isLoading ? "—" : releases.length}</Text>
                    <Text style={styles.statLabel}>RELEASES</Text>
                  </View>
                </View>
              </View>

              <View style={styles.catalogueHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>THE CATALOGUE</Text>
                  <Text style={styles.sectionTitle}>Discography</Text>
                </View>
                {releases.length > 0 ? <Text style={styles.count}>{releases.length} releases</Text> : null}
              </View>

              {releasesQuery.isLoading ? (
                <View style={styles.releaseLoading}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.stateCopy}>Finding albums and releases…</Text>
                </View>
              ) : null}
              {releasesQuery.isError ? (
                <Pressable onPress={() => releasesQuery.refetch()} style={styles.releaseRetry} accessibilityRole="button">
                  <Ionicons name="refresh" size={15} color={colors.accent} />
                  <Text style={styles.retryText}>Couldn't load releases · Tap to retry</Text>
                </Pressable>
              ) : null}
              {!releasesQuery.isLoading && !releasesQuery.isError && releases.length === 0 ? (
                <View style={styles.emptyShelf}>
                  <Ionicons name="disc-outline" size={21} color={colors.subtle} />
                  <Text style={styles.stateCopy}>No releases are available for this artist yet.</Text>
                </View>
              ) : null}
              {albums.length > 0 ? <ReleaseShelf title="Albums" releases={albums} colors={colors} onOpen={openRelease} /> : null}
              {eps.length > 0 ? <ReleaseShelf title="EPs" releases={eps} colors={colors} onOpen={openRelease} /> : null}
              {singles.length > 0 ? <ReleaseShelf title="Singles" releases={singles} colors={colors} onOpen={openRelease} /> : null}

              <View style={styles.trackHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>LISTEN THROUGH</Text>
                  <Text style={styles.sectionTitle}>All tracks</Text>
                </View>
                {!tracksQuery.isLoading && tracks.length > 0 ? (
                  <View style={styles.trackCountPill}>
                    <Text style={styles.count}>{tracks.length} tracks</Text>
                  </View>
                ) : null}
              </View>

              {tracksQuery.isLoading ? (
                <View style={styles.state}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.stateTitle}>Finding tracks</Text>
                  <Text style={styles.stateCopy}>Loading this artist's catalogue…</Text>
                </View>
              ) : null}
              {tracksQuery.isError ? (
                <View style={styles.state}>
                  <Ionicons name="cloud-offline-outline" size={23} color={colors.danger} />
                  <Text style={styles.stateTitle}>Couldn't load this artist</Text>
                  <Text style={styles.stateCopy}>{tracksQuery.error instanceof Error ? tracksQuery.error.message : "Please try again."}</Text>
                  <Pressable onPress={() => tracksQuery.refetch()} style={styles.retry} accessibilityRole="button">
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </Pressable>
                </View>
              ) : null}
              {!tracksQuery.isLoading && !tracksQuery.isError && tracks.length === 0 ? (
                <View style={styles.state}>
                  <Ionicons name="musical-notes-outline" size={23} color={colors.subtle} />
                  <Text style={styles.stateTitle}>No tracks found</Text>
                  <Text style={styles.stateCopy}>This artist's catalogue isn't available right now.</Text>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item: track, index }) => <TrackRow track={track} index={index} showIndex queue={tracks} />}
        />
      </SafeAreaView>
    </PageEntrance>
  );
}

function createStyles(colors: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: "transparent" },
    content: { paddingHorizontal: 18, paddingBottom: 42 },
    back: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 13, marginBottom: 5 },
    backIcon: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: colors.border },
    backText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    hero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 17, paddingBottom: 18, gap: 11, marginBottom: 28, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.035)", borderWidth: 1, borderColor: colors.border },
    heroTopline: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
    artistTag: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.055)" },
    artistDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.45 },
    title: { color: colors.text, fontSize: 29, fontWeight: "900", letterSpacing: -0.9, textAlign: "center", marginTop: 2 },
    copy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", maxWidth: 270 },
    heroStats: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 27, marginTop: 7, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.border, width: "100%" },
    stat: { alignItems: "center", gap: 3, minWidth: 60 },
    statValue: { color: colors.text, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
    statLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
    statDivider: { width: 1, height: 27, backgroundColor: colors.border },
    catalogueHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 15 },
    sectionEyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.65, marginBottom: 4 },
    sectionTitle: { color: colors.text, fontSize: 21, fontWeight: "900", letterSpacing: -0.55 },
    count: { color: colors.subtle, fontSize: 10, fontWeight: "700" },
    releaseLoading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 25 },
    releaseRetry: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
    emptyShelf: { minHeight: 88, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.025)", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 23, padding: 15 },
    trackHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13, marginTop: 4, marginBottom: 8 },
    trackCountPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: colors.border },
    state: { minHeight: 165, alignItems: "center", justifyContent: "center", padding: 22, gap: 9 },
    stateTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
    stateCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
    retry: { marginTop: 5, paddingHorizontal: 17, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.accent },
    retryButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    retryText: { color: colors.accent, fontSize: 11, fontWeight: "700" }
  });
}

function ReleaseShelf({ title, releases, colors, onOpen }: { title: string; releases: MusicRelease[]; colors: ThemePalette; onOpen: (release: MusicRelease) => void }) {
  return (
    <View style={{ marginBottom: 25, paddingTop: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 }}>{title}</Text>
        <Text style={{ color: colors.subtle, fontSize: 9, fontWeight: "700" }}>{releases.length} {releases.length === 1 ? "release" : "releases"}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 13, paddingRight: 20 }}
        snapToInterval={165}
        snapToAlignment="start"
        decelerationRate="fast"
        directionalLockEnabled
      >
        {releases.map((release) => <ReleaseCard key={release.id} release={release} colors={colors} onPress={() => onOpen(release)} />)}
      </ScrollView>
    </View>
  );
}

function ReleaseCard({ release, colors, onPress }: { release: MusicRelease; colors: ThemePalette; onPress: () => void }) {
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressOpacity = useRef(new Animated.Value(1)).current;
  const animatePress = (pressed: boolean) => {
    if (motionStyle === "off") return;
    Animated.parallel([
      Animated.spring(pressScale, { toValue: pressed ? 0.975 : 1, speed: 28, bounciness: 4, useNativeDriver: true }),
      Animated.timing(pressOpacity, { toValue: pressed ? 0.86 : 1, duration: pressed ? 90 : 140, useNativeDriver: true })
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${release.title}, ${release.kind}`}
    >
      <Animated.View style={{
        width: 152,
        padding: 8,
        borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.045)",
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressOpacity,
        transform: [{ scale: pressScale }]
      }}>
        <AlbumArtwork uri={release.artwork} size={134} radius={15} />
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, fontWeight: "750", lineHeight: 16, marginTop: 10 }}>{release.title}</Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>{release.subtitle}</Text>
      </Animated.View>
    </Pressable>
  );
}
