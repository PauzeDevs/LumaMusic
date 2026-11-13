import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFeaturedPlaylists, getDiscoveryTracks } from "../../services/youtubeMusic";
import type { ThemePalette } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { SectionHeading } from "../../components/SectionHeading";
import { TrackRow } from "../../components/TrackRow";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { useLibraryStore } from "../../store/library";
import type { MusicTrack } from "../../types/music";

export default function ListenScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const { playTrack } = useAudioEngine();
  const recentTracks = useLibraryStore((state) => state.recentTracks);
  const [heroArtworkFailed, setHeroArtworkFailed] = useState(false);
  const { data: tracks = [], isLoading: loading, error, refetch: loadTrending } = useQuery({
    queryKey: ["youtubeMusic", "trending", 20],
    queryFn: () => getDiscoveryTracks(20)
  });
  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["youtubeMusic", "trending-playlists", 8],
    queryFn: () => getFeaturedPlaylists(8)
  });

  useEffect(() => setHeroArtworkFailed(false), [tracks[0]?.artwork]);

  const play = (track: MusicTrack, queue: MusicTrack[]) => {
    void playTrack(track, queue).catch((err: unknown) => {
      Alert.alert("Couldn't start playback", err instanceof Error ? err.message : "Please try another track.");
    });
  };
  const featured = tracks[0];
  const featuredPlaylist = playlists[0];
  const heroTitle = featuredPlaylist?.title ?? featured?.title ?? "Find your next favourite";
  const heroSubtitle = featuredPlaylist?.subtitle ?? featured?.artist ?? "A fresh mix, picked for your next listening session";
  const heroArtwork = featuredPlaylist?.artwork ?? featured?.artwork;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Ionicons name="play" size={20} color="#09090A" /></View>
            <Text style={styles.brandName}>LumaMusic</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open your profile and settings" style={styles.menuButton} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="menu" size={27} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          {heroArtwork && !heroArtworkFailed
            ? <Image source={{ uri: heroArtwork }} style={styles.heroImage} onError={() => setHeroArtworkFailed(true)} />
            : <View style={styles.heroFallback}><Ionicons name="musical-notes" size={58} color="rgba(255,255,255,0.35)" /></View>}
          <View style={styles.heroShade} />
          <View style={styles.heroTopline}>
            <Text style={styles.heroEyebrow}>MADE FOR YOUR ROTATION</Text>
            <Ionicons name="sparkles" size={17} color="rgba(255,255,255,0.88)" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.because}>Because you listen to</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>{heroTitle}</Text>
            <Text numberOfLines={1} style={styles.heroSubtitle}>{heroSubtitle}</Text>
            <Pressable style={styles.viewButton} onPress={() => {
              if (featuredPlaylist?.sourcePlaylistId) router.push({ pathname: "/playlist/[id]", params: { id: featuredPlaylist.sourcePlaylistId, title: featuredPlaylist.title, artwork: featuredPlaylist.artwork ?? "" } });
              else if (featured) play(featured, tracks);
              else router.push("/(tabs)/search");
            }}>
              <Text style={styles.viewButtonText}>{featuredPlaylist ? "View" : "Play"} </Text>
              <Ionicons name="arrow-forward" size={15} color="#111113" />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Recently played" action="See all" onPress={() => router.push("/(tabs)/library")} />
          {recentTracks.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recentTracks.slice(0, 12).map((track) => (
                <Pressable key={track.id} style={styles.recentCard} onPress={() => play(track, recentTracks)}>
                  <Image source={track.artwork ? { uri: track.artwork } : undefined} style={styles.recentArtwork} />
                  <Text numberOfLines={1} style={styles.recentTitle}>{track.title}</Text>
                  <Text numberOfLines={1} style={styles.recentArtist}>{track.artist}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="time-outline" size={20} color={colors.subtle} />
              <Text style={styles.emptyRecentText}>Your recently played tracks will show up here.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeading title="Made for the moment" action="Explore" onPress={() => router.push("/(tabs)/search")} />
          {playlistsLoading ? <Text style={styles.message}>Finding your next mix…</Text> : null}
          {playlistsError ? <Text style={styles.message}>Could not load mixes right now.</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {playlists.slice(1, 7).map((playlist) => (
              <Pressable key={playlist.id} style={styles.mixCard} onPress={() => playlist.sourcePlaylistId && router.push({ pathname: "/playlist/[id]", params: { id: playlist.sourcePlaylistId, title: playlist.title, artwork: playlist.artwork ?? "" } })}>
                {playlist.artwork ? <Image source={{ uri: playlist.artwork }} style={styles.mixArtwork} /> : <View style={styles.mixFallback}><Ionicons name="musical-notes" size={28} color={colors.muted} /></View>}
                <Text numberOfLines={1} style={styles.mixTitle}>{playlist.title}</Text>
                <Text numberOfLines={1} style={styles.mixSubtitle}>{playlist.subtitle ?? "A LumaMusic mix"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Most played right now" action="Refresh" onPress={() => { void loadTrending(); }} />
          {loading ? <Text style={styles.message}>Finding fresh tracks…</Text> : null}
          {error ? <View style={styles.errorCard}><Text style={styles.message}>{error instanceof Error ? error.message : "Could not load music discovery."}</Text><Pressable onPress={() => { void loadTrending(); }}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
          {!loading && !error ? tracks.slice(0, 8).map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />) : null}
        </View>
        <Text style={styles.footer}>LumaMusic</Text>
      </ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 28 },
  header: { height: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { width: 39, height: 39, borderRadius: 12, backgroundColor: "#F3F3F4", alignItems: "center", justifyContent: "center" },
  brandName: { color: colors.text, fontSize: 23, fontWeight: "900", letterSpacing: -0.9 },
  menuButton: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(31,31,34,0.94)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  hero: { height: 430, borderRadius: 27, overflow: "hidden", marginBottom: 31, backgroundColor: "#171719", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#202024" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)" },
  heroTopline: { position: "absolute", top: 20, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroEyebrow: { color: "rgba(255,255,255,0.84)", fontSize: 9, fontWeight: "900", letterSpacing: 1.8 },
  heroCopy: { position: "absolute", left: 20, right: 20, bottom: 22 },
  because: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 31, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 7 },
  viewButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "#F1F1F2", paddingHorizontal: 17, paddingVertical: 11, borderRadius: 24, marginTop: 17, gap: 5 },
  viewButtonText: { color: "#111113", fontSize: 12, fontWeight: "800" },
  section: { marginBottom: 30 },
  horizontalList: { gap: 14, paddingRight: 5 },
  recentCard: { width: 142 },
  recentArtwork: { width: 142, height: 142, borderRadius: 18, backgroundColor: colors.surfaceElevated },
  recentTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 9 },
  recentArtist: { color: colors.muted, fontSize: 11, marginTop: 3 },
  emptyRecent: { minHeight: 90, borderRadius: 18, backgroundColor: "rgba(24,24,27,0.86)", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16 },
  emptyRecentText: { color: colors.muted, fontSize: 12, flex: 1 },
  mixCard: { width: 142 },
  mixArtwork: { width: 142, height: 142, borderRadius: 18, backgroundColor: colors.surfaceElevated },
  mixFallback: { width: 142, height: 142, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  mixTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 9 },
  mixSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 14 },
  errorCard: { backgroundColor: colors.surface, borderRadius: 15, padding: 14 },
  retry: { color: colors.accent, fontSize: 12, fontWeight: "800", paddingVertical: 8 },
  footer: { color: colors.subtle, fontSize: 11, textAlign: "center", paddingVertical: 12 }
}); }
