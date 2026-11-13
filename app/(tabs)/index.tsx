import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useListeningStatsStore } from "../../store/listeningStats";

export default function ListenScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const { playTrack } = useAudioEngine();
  const recentTracks = useLibraryStore((state) => state.recentTracks);
  const listeningDays = useListeningStatsStore((state) => state.days);
  const mostPlayed = useMemo(() => {
    const totals = new Map<string, { id: string; title: string; artist: string; artwork: string; plays: number; seconds: number }>();
    Object.values(listeningDays).forEach((day) => Object.values(day.tracks).forEach((track) => {
      const previous = totals.get(track.id);
      totals.set(track.id, { id: track.id, title: track.title, artist: track.artist, artwork: track.artwork, plays: (previous?.plays ?? 0) + track.plays, seconds: (previous?.seconds ?? 0) + track.seconds });
    }));
    return [...totals.values()].sort((a, b) => b.plays - a.plays || b.seconds - a.seconds).slice(0, 8);
  }, [listeningDays]);
  const scrollY = useRef(new Animated.Value(0)).current;
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
          <View style={styles.heroContent}>
            <View style={styles.heroTag}><View style={styles.dot} /><Text style={styles.heroTagText}>DISCOVER SOMETHING NEW</Text></View>
            <Text style={styles.heroKicker}>BECAUSE YOU LISTEN</Text>
            <Text numberOfLines={2} style={styles.heroTitle}>{recentTracks[0]?.artist || tracks[0]?.artist || "Your next favourite"}</Text>
            <Text numberOfLines={1} style={styles.heroSub}>{recentTracks[0]?.title || tracks[0]?.title || "A new discovery is waiting"}</Text>
            <Pressable style={styles.heroButton} onPress={startListening}>
              <Ionicons name="play" size={15} color="#101018" />
              <Text style={styles.heroButtonText}>Start listening</Text>
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

        {recentTracks.length > 0 ? <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Recently played" action="See all" onPress={() => router.push("/(tabs)/library")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackRail}>
            {recentTracks.slice(0, 10).map((track) => <Pressable key={track.id} style={styles.recentCard} onPress={() => { void playTrack(track, recentTracks); }} accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}`}>
              {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.recentArt} /> : <View style={styles.recentArtFallback}><Ionicons name="musical-notes" size={25} color={colors.muted} /></View>}
              <Text numberOfLines={1} style={styles.recentTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.recentArtist}>{track.artist}</Text>
            </Pressable>)}
          </ScrollView>
        </View></ScrollReveal> : null}

        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Featured playlists" action="Search" onPress={() => router.push("/(tabs)/search")} />
          {playlistsLoading ? <Text style={styles.message}>Loading playlists…</Text> : null}
          {playlistsError ? <Text style={styles.errorText}>Could not load playlists right now.</Text> : null}
          {!playlistsLoading && !playlistsError && playlists.length === 0 ? <Text style={styles.message}>No public playlists are available right now.</Text> : null}
          <PlaylistStack items={playlists.map((playlist) => ({
            id: playlist.id,
            title: playlist.title,
            subtitle: playlist.subtitle,
            artwork: playlist.artwork,
            onPress: () => playlist.sourcePlaylistId ? router.push({ pathname: "/playlist/[id]", params: { id: playlist.sourcePlaylistId, title: playlist.title, artwork: playlist.artwork } }) : undefined
          }))} emptyText="No featured playlists right now." />
        </View></ScrollReveal>

        <View style={styles.section}>
          <SectionHeading title="Most Played" action="Refresh" onPress={() => { void loadTrending(); }} />
          {loading ? <Text style={styles.message}>Finding fresh tracks…</Text> : null}
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error instanceof Error ? error.message : "Could not load music discovery."}</Text>
              <Pressable onPress={() => { void loadTrending(); }}><Text style={styles.retry}>Try again</Text></Pressable>
            </View>
          ) : null}
          {!loading && !error && tracks.length === 0 ? <Text style={styles.message}>No tracks are available right now.</Text> : null}
          {!loading && !error ? tracks.slice(0, 6).map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />) : null}
        </View></ScrollReveal>

        {mostPlayed.length > 0 ? <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Most played" action="Your stats" onPress={() => router.push("/stats")} />
          {mostPlayed.slice(0, 5).map((track, index) => <Pressable key={track.id} style={styles.mostPlayedRow} onPress={() => router.push("/stats")}>
            <Text style={styles.mostPlayedRank}>{String(index + 1).padStart(2, "0")}</Text>
            {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.mostPlayedArt} /> : <View style={styles.mostPlayedArtFallback}><Ionicons name="musical-notes" size={16} color={colors.muted} /></View>}
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.mostPlayedTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.mostPlayedArtist}>{track.artist}</Text></View>
            <Text style={styles.playCount}>{track.plays} plays</Text>
          </Pressable>)}
        </View></ScrollReveal> : null}

        <ScrollReveal scrollY={scrollY}><View style={styles.sourceNote}>
          <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
          <Text style={styles.sourceText}>Music discovery for your next favourite.</Text>
        </View></ScrollReveal>
      </Animated.ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 22 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  greeting: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(116,55,83,0.32)", borderWidth: 1, borderColor: "rgba(255,105,135,0.42)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  searchPrompt: { height: 58, borderRadius: 20, marginBottom: 24, borderColor: "rgba(255,255,255,0.22)", backgroundColor: "rgba(72,52,67,0.34)" },
  searchPromptContent: { flex: 1 },
  searchPromptInner: { flex: 1, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchText: { color: colors.muted, fontSize: 13, flex: 1 },
  hero: { height: 286, borderRadius: 30, overflow: "hidden", marginBottom: 32, backgroundColor: "#21131C", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)" },
  heroImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%", opacity: 0.78 },
  heroPlaceholder: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated },
  heroShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(10,5,12,0.52)" },
  heroContent: { flex: 1, padding: 22, justifyContent: "flex-end" },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  heroTagText: { color: "#FFE2E9", fontSize: 9, fontWeight: "800", letterSpacing: 1.7 },
  heroKicker: { color: "rgba(255,255,255,0.72)", fontSize: 9, fontWeight: "900", letterSpacing: 1.6, marginBottom: 7 },
  heroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 8 },
  heroButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,245,248,0.94)", paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, marginTop: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
  heroButtonText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  section: { marginBottom: 30 },
  trackRail: { gap: 13, paddingRight: 16 },
  recentCard: { width: 132 }, recentArt: { width: 132, height: 132, borderRadius: 17, backgroundColor: colors.surface },
  recentArtFallback: { width: 132, height: 132, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  recentTitle: { color: colors.text, fontSize: 11, fontWeight: "800", marginTop: 9 }, recentArtist: { color: colors.muted, fontSize: 10, marginTop: 3 },
  mostPlayedRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  mostPlayedRank: { color: colors.subtle, width: 19, fontSize: 10, fontWeight: "800" },
  mostPlayedArt: { width: 42, height: 42, borderRadius: 9, backgroundColor: colors.surface },
  mostPlayedArtFallback: { width: 42, height: 42, borderRadius: 9, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  mostPlayedTitle: { color: colors.text, fontSize: 11, fontWeight: "800" }, mostPlayedArtist: { color: colors.muted, fontSize: 9, marginTop: 3 }, playCount: { color: colors.subtle, fontSize: 9, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  errorCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10 },
  errorText: { color: colors.muted, fontSize: 12, paddingVertical: 12 },
  retry: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  sourceNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sourceText: { color: colors.subtle, fontSize: 11 }
}); }
