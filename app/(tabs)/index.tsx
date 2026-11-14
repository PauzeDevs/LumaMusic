import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useTheme } from "../../theme/useTheme";
import { useSiriRefresh, SiriRefreshOverlay } from "../../components/SiriRefresh";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { useLibraryStore } from "../../store/library";
import { getFeaturedPlaylists, getDiscoveryTracks } from "../../services/youtubeMusic";
import type { ThemePalette } from "../../theme/colors";
import type { MusicTrack } from "../../types/music";

export default function ListenScreen() {
  const { colors, blurTint, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const { playTrack } = useAudioEngine();
  const recentTracks = useLibraryStore((state) => state.recentTracks);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroFade = useRef(new Animated.Value(1)).current;
  const { data: tracks = [], isLoading, error, refetch } = useQuery({ queryKey: ["youtubeMusic", "trending", 20], queryFn: () => getDiscoveryTracks(20) });
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({ queryKey: ["youtubeMusic", "trending-playlists", 8], queryFn: () => getFeaturedPlaylists(8) });
  const heroTrack = recentTracks[0] ?? tracks[0];
  const horizontalRecent = recentTracks.length ? recentTracks : tracks.slice(0, 10);

  useEffect(() => {
    setHeroFailed(false);
    heroFade.setValue(0);
    Animated.timing(heroFade, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  }, [heroTrack?.id, heroTrack?.artwork, heroFade]);

  const play = (track: MusicTrack, queue: MusicTrack[]) => {
    void playTrack(track, queue).catch(() => {});
  };

  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require("../../assets/lumamusic-icon.png")} style={styles.logo} />
          <Text style={styles.brandName}>LumaMusic</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.menuButton}>
          <Ionicons name="menu" size={27} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        {heroTrack?.artwork && !heroFailed
          ? <Animated.Image source={{ uri: heroTrack.artwork }} style={[styles.heroImage, { opacity: heroFade }]} onError={() => setHeroFailed(true)} />
          : <View style={styles.heroFallback}><Ionicons name="musical-notes" size={54} color={colors.accent} /></View>}
        <View style={styles.heroShade} />
        <View style={styles.heroTop}>
          <View style={styles.liveTag}><View style={styles.dot} /><Text style={styles.tagText}>YOUR DAILY SOUNDTRACK</Text></View>
          <Ionicons name="sparkles" size={21} color="#FFFFFF" />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{recentTracks.length ? "PICK UP WHERE YOU LEFT OFF" : "MADE FOR YOUR ROTATION"}</Text>
          <Text numberOfLines={2} style={styles.heroTitle}>{heroTrack?.title ?? "Find your next favourite."}</Text>
          <Text numberOfLines={1} style={styles.heroArtist}>{heroTrack?.artist ?? "A soundtrack for right now"}</Text>
          <Pressable onPress={() => heroTrack ? play(heroTrack, recentTracks.length ? recentTracks : tracks) : router.push("/(tabs)/search")} style={styles.viewButton}>
            <Text style={styles.viewText}>{heroTrack ? "Listen now" : "Explore music"}</Text>
            <Ionicons name="arrow-forward" size={17} color="#101014" />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <Pressable onPress={() => router.push("/(tabs)/library")} style={styles.seeAll}><Text style={styles.seeAllText}>See all</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>
        </View>
        {horizontalRecent.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {horizontalRecent.slice(0, 12).map((track, index) => <Pressable key={track.id} onPress={() => play(track, horizontalRecent)} style={({ pressed }) => [styles.albumCard, { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.albumArt} /> : <View style={styles.albumFallback}><Ionicons name="musical-notes" size={30} color={colors.accent} /></View>}
            <Text numberOfLines={1} style={styles.albumTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.albumArtist}>{track.artist}</Text>
          </Pressable>)}
        </ScrollView> : <Text style={styles.emptyText}>{isLoading ? "Finding music for you…" : "Your recently played tracks will appear here."}</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Made for you</Text><Pressable onPress={() => router.push("/(tabs)/search")}><Text style={styles.seeAllText}>Explore</Text></Pressable></View>
        {playlistsLoading ? <Text style={styles.emptyText}>Curating your mix…</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {playlists.slice(0, 10).map((playlist) => <Pressable key={playlist.id} onPress={() => playlist.sourcePlaylistId && router.push({ pathname: "/playlist/[id]", params: { id: playlist.sourcePlaylistId, title: playlist.title, artwork: playlist.artwork } })} style={styles.playlistCard}>
            {playlist.artwork ? <Image source={{ uri: playlist.artwork }} style={styles.albumArt} /> : <View style={styles.albumFallback}><Ionicons name="albums" size={30} color={colors.accent} /></View>}
            <Text numberOfLines={1} style={styles.albumTitle}>{playlist.title}</Text><Text numberOfLines={1} style={styles.albumArtist}>{playlist.subtitle ?? "Playlist"}</Text>
          </Pressable>)}
        </ScrollView>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Discover something new</Text><Pressable onPress={() => { void refetch(); }}><Ionicons name="refresh" size={18} color={colors.muted} /></Pressable></View>
        {error ? <Text style={styles.emptyText}>Could not load recommendations. Pull down to try again.</Text> : tracks.slice(0, 6).map((track) => <Pressable key={track.id} onPress={() => play(track, tracks)} style={styles.trackRow}>
          {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.trackArt} /> : <View style={styles.trackArtFallback}><Ionicons name="musical-notes" color={colors.accent} size={18} /></View>}
          <View style={styles.trackCopy}><Text numberOfLines={1} style={styles.albumTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.albumArtist}>{track.artist}</Text></View>
          <Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} />
        </Pressable>)}
      </View>
    </ScrollView>
    <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
  </SafeAreaView>;
}

function createStyles(colors: ThemePalette, isDark: boolean) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 34 },
  header: { height: 82, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 14 },
  brandName: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: -1.1 },
  menuButton: { width: 54, height: 54, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.045)", borderWidth: 1, borderColor: colors.border },
  hero: { height: 510, marginHorizontal: 14, marginTop: 14, marginBottom: 34, overflow: "hidden", borderRadius: 28, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.43)" },
  heroTop: { position: "absolute", top: 20, left: 20, right: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.38)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  tagText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heroCopy: { position: "absolute", left: 22, right: 22, bottom: 25 },
  kicker: { color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "800", letterSpacing: 1.7, marginBottom: 8 },
  heroTitle: { color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -1.25 },
  heroArtist: { color: "rgba(255,255,255,0.78)", fontSize: 15, fontWeight: "600", marginTop: 7 },
  viewButton: { alignSelf: "flex-start", marginTop: 18, borderRadius: 24, paddingHorizontal: 19, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.96)", flexDirection: "row", alignItems: "center", gap: 12 },
  viewText: { color: "#101014", fontSize: 13, fontWeight: "800" },
  section: { marginBottom: 34 },
  sectionHeading: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.6 },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  horizontal: { paddingHorizontal: 20, gap: 14 },
  albumCard: { width: 164 },
  playlistCard: { width: 164 },
  albumArt: { width: 164, height: 164, borderRadius: 24, backgroundColor: colors.surfaceElevated },
  albumFallback: { width: 164, height: 164, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  albumTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 9 },
  albumArtist: { color: colors.muted, fontSize: 11, marginTop: 3 },
  emptyText: { color: colors.muted, fontSize: 12, paddingHorizontal: 20, paddingVertical: 16 },
  trackRow: { marginHorizontal: 20, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  trackArt: { width: 48, height: 48, borderRadius: 9 },
  trackArtFallback: { width: 48, height: 48, borderRadius: 9, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  trackCopy: { flex: 1 }
}); }
