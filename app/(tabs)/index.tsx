import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../../components/GlassSurface";

import { getFeaturedPlaylists, getDiscoveryTracks } from "../../services/youtubeMusic";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { PlaylistStack } from "../../components/PlaylistStack";
import { SectionHeading } from "../../components/SectionHeading";
import { TrackRow } from "../../components/TrackRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";

export default function ListenScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const { playTrack } = useAudioEngine();
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

  useEffect(() => setHeroArtworkFailed(false), [tracks[0]?.artwork]);

  const startListening = () => {
    if (!tracks.length) {
      Alert.alert("Music is loading", error instanceof Error ? error.message : "Try again when discovery has loaded.");
      return;
    }
    void playTrack(tracks[0], tracks).catch((err: unknown) => {
      Alert.alert("Couldn't start playback", err instanceof Error ? err.message : "Please try another track.");
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.ScrollView onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={8} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <ScrollReveal scrollY={scrollY}><View style={styles.topline}>
          <View>
            <Text style={styles.eyebrow}>YOUR SOUND, YOUR SPACE</Text>
            <Text style={styles.greeting}>{new Date().getHours() < 12 ? "Good morning." : new Date().getHours() < 18 ? "Good afternoon." : "Good evening."}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.avatarText}>P</Text>
          </Pressable>
        </View></ScrollReveal>

        <ScrollReveal scrollY={scrollY} delay={25}><GlassSurface style={styles.searchPrompt} contentStyle={styles.searchPromptContent}><Pressable style={styles.searchPromptInner} onPress={() => router.push("/(tabs)/search")}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <Text style={styles.searchText}>Songs, artists, moods...</Text>
          <Ionicons name="options-outline" size={18} color={colors.subtle} />
        </Pressable></GlassSurface></ScrollReveal>

        <ScrollReveal scrollY={scrollY} delay={45}><View style={styles.hero}>
          {tracks[0]?.artwork && !heroArtworkFailed ? <Image source={{ uri: tracks[0].artwork }} style={styles.heroImage} onError={() => setHeroArtworkFailed(true)} /> : <View style={styles.heroPlaceholder}><Ionicons name="musical-notes" size={42} color={colors.accent} /></View>}
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}><View style={styles.dot} /><Text style={styles.heroTagText}>DISCOVER SOMETHING NEW</Text></View>
            <Text style={styles.heroTitle}>Find your{ "\n" }next frequency.</Text>
            <Text style={styles.heroSub}>A softer place to land.</Text>
            <Pressable style={styles.heroButton} onPress={startListening}>
              <Ionicons name="play" size={15} color="#101018" />
              <Text style={styles.heroButtonText}>Start listening</Text>
            </Pressable>
          </View>
        </View></ScrollReveal>

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

        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Fresh discoveries" action="Refresh" onPress={() => { void loadTrending(); }} />
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

        <ScrollReveal scrollY={scrollY}><View style={styles.sourceNote}>
          <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
          <Text style={styles.sourceText}>Music discovery for your next favourite.</Text>
        </View></ScrollReveal>
      </Animated.ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  heroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 8 },
  heroButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,245,248,0.94)", paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, marginTop: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
  heroButtonText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  section: { marginBottom: 30 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  errorCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10 },
  errorText: { color: colors.muted, fontSize: 12, paddingVertical: 12 },
  retry: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  sourceNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sourceText: { color: colors.subtle, fontSize: 11 }
});