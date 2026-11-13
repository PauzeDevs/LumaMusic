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

  useEffect(() => setHeroArtworkFailed(false), [playlists[0]?.artwork, tracks[0]?.artwork]);

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

  const openFeatured = () => {
    if (featuredPlaylist?.sourcePlaylistId) {
      router.push({ pathname: "/playlist/[id]", params: { id: featuredPlaylist.sourcePlaylistId, title: featuredPlaylist.title, artwork: featuredPlaylist.artwork ?? "" } });
    } else if (featured) play(featured, tracks);
    else router.push("/(tabs)/search");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require("../../assets/lumamusic-icon.png")} style={styles.brandLogo} resizeMode="contain" />
            <Text style={styles.brandName}>LumaMusic</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open menu" style={styles.menuButton} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="menu" size={28} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          {heroArtwork && !heroArtworkFailed
            ? <Image source={{ uri: heroArtwork }} style={styles.heroBlur} blurRadius={14} onError={() => setHeroArtworkFailed(true)} />
            : <View style={styles.heroFallback} />}
          {heroArtwork && !heroArtworkFailed
            ? <Image source={{ uri: heroArtwork }} style={styles.heroArtwork} resizeMode="cover" />
            : <Ionicons name="musical-notes" size={64} color="rgba(255,255,255,0.25)" style={styles.heroIcon} />}
          <View style={styles.heroShade} />
          <View style={styles.heroTopline}>
            <View style={styles.heroPill}><View style={styles.liveDot} /><Text style={styles.heroEyebrow}>YOUR DAILY SOUNDTRACK</Text></View>
            <Ionicons name="sparkles" size={19} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.because}>Because you listen to</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>{heroTitle}</Text>
            <Text numberOfLines={1} style={styles.heroSubtitle}>{heroSubtitle}</Text>
            <Pressable style={styles.viewButton} onPress={openFeatured}>
              <Text style={styles.viewButtonText}>{featuredPlaylist ? "View" : "Play"}</Text>
              <Ionicons name="arrow-forward" size={16} color="#111113" />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Recently Played" action="See all" onPress={() => router.push("/(tabs)/library")} />
          {recentTracks.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {recentTracks.slice(0, 12).map((track) => (
                <Pressable key={track.id} style={styles.recentCard} onPress={() => play(track, recentTracks)}>
                  <Image source={track.artwork ? { uri: track.artwork } : require("../../assets/lumamusic-icon.png")} style={styles.recentArtwork} />
                  <Text numberOfLines={1} style={styles.recentTitle}>{track.title}</Text>
                  <Text numberOfLines={1} style={styles.recentArtist}>{track.artist}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="time-outline" size={21} color={colors.subtle} />
              <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>Your listening story starts here</Text><Text style={styles.emptyText}>Play a track and it will show up here.</Text></View>
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
          <SectionHeading title="Most Played" action="Refresh" onPress={() => { void loadTrending(); }} />
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
  content: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 22 },
  header: { height: 78, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 0, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.055)" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandLogo: { width: 38, height: 38, borderRadius: 11 },
  brandName: { color: colors.text, fontSize: 23, fontWeight: "900", letterSpacing: -0.9 },
  menuButton: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(31,31,34,0.94)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  hero: { height: 430, marginBottom: 28, overflow: "hidden", backgroundColor: "#101014", justifyContent: "flex-end" },
  heroBlur: { ...StyleSheet.absoluteFill, width: "100%", height: "100%", opacity: 0.78, transform: [{ scale: 1.12 }] },
  heroArtwork: { ...StyleSheet.absoluteFill, width: "100%", height: "100%", opacity: 0.56 },
  heroFallback: { ...StyleSheet.absoluteFill, backgroundColor: "#17171C" },
  heroIcon: { position: "absolute", top: "36%", alignSelf: "center" },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.36)" },
  heroTopline: { position: "absolute", top: 19, left: 21, right: 21, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(0,0,0,0.28)", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  heroEyebrow: { color: "rgba(255,255,255,0.9)", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  heroCopy: { paddingHorizontal: 22, paddingBottom: 24 },
  because: { color: "rgba(255,255,255,0.83)", fontSize: 14, fontWeight: "700", marginBottom: 5 },
  heroTitle: { color: "#FFFFFF", fontSize: 29, lineHeight: 33, fontWeight: "900", letterSpacing: -0.9, maxWidth: "94%" },
  heroSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 7 },
  viewButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "#F1F1F2", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, marginTop: 17, gap: 9 },
  viewButtonText: { color: "#111113", fontSize: 13, fontWeight: "800" },
  section: { paddingHorizontal: 20, marginBottom: 29 },
  horizontalList: { gap: 13, paddingRight: 4 },
  recentCard: { width: 126 },
  recentArtwork: { width: 126, height: 126, borderRadius: 17, backgroundColor: colors.surfaceElevated },
  recentTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 8 },
  recentArtist: { color: colors.muted, fontSize: 11, marginTop: 3 },
  emptyRecent: { minHeight: 88, borderRadius: 18, backgroundColor: "rgba(24,24,27,0.9)", borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16 },
  emptyCopy: { flex: 1, gap: 4 },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  emptyText: { color: colors.muted, fontSize: 11 },
  mixCard: { width: 126 },
  mixArtwork: { width: 126, height: 126, borderRadius: 17, backgroundColor: colors.surfaceElevated },
  mixFallback: { width: 126, height: 126, borderRadius: 17, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  mixTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 8 },
  mixSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 14 },
  errorCard: { backgroundColor: colors.surface, borderRadius: 15, padding: 14 },
  retry: { color: colors.accent, fontSize: 12, fontWeight: "800", paddingVertical: 8 },
  footer: { color: colors.subtle, fontSize: 11, textAlign: "center", paddingVertical: 12 }
}); }
