import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArtistRow } from "../../components/ArtistRow";
import { PlaylistRow } from "../../components/PlaylistRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { TrackRow } from "../../components/TrackRow";
import type { ThemePalette } from "../../theme/colors";
import { useTheme } from "../../theme/useTheme";
import {
  searchYouTubeMusicAlbums,
  searchYouTubeMusicArtists,
  searchYouTubeMusicPlaylists,
  searchYouTubeMusicTracks
} from "../../services/youtubeMusic";

const filters = ["All", "Songs", "Artists", "Albums", "Playlists"] as const;
type SearchFilter = typeof filters[number];

const moods = [
  { label: "Chill", query: "chill music", tint: "#536779", icon: "moon-outline" },
  { label: "Commute", query: "commute music", tint: "#75652F", icon: "car-outline" },
  { label: "Energize", query: "high energy hits", tint: "#687044", icon: "flash-outline" },
  { label: "Feel good", query: "feel good pop", tint: "#3F6958", icon: "sunny-outline" },
  { label: "Focus", query: "focus music", tint: "#4D5D70", icon: "book-outline" },
  { label: "Gaming", query: "gaming music", tint: "#594B79", icon: "game-controller-outline" },
  { label: "Late night", query: "late night music", tint: "#51436C", icon: "moon" },
  { label: "Punjabi", query: "Punjabi hits", tint: "#765044", icon: "musical-notes-outline" }
] as const;

export default function SearchScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const scrollY = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilter>("All");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => clearTimeout(timer);
  }, [query]);

  const moodQueries = useQueries({
    queries: moods.map((mood) => ({
      queryKey: ["youtubeMusic", "mood-art", mood.query],
      queryFn: () => searchYouTubeMusicTracks(mood.query, 3),
      staleTime: 1000 * 60 * 30,
      retry: 1
    }))
  });

  const songsQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "songs", debouncedQuery],
    queryFn: () => searchYouTubeMusicTracks(debouncedQuery, 30),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Songs"),
    staleTime: 30_000
  });
  const artistsQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "artists", debouncedQuery],
    queryFn: () => searchYouTubeMusicArtists(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Artists"),
    staleTime: 30_000
  });
  const albumsQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "albums", debouncedQuery],
    queryFn: () => searchYouTubeMusicAlbums(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Albums"),
    staleTime: 30_000
  });
  const playlistsQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "playlists", debouncedQuery],
    queryFn: () => searchYouTubeMusicPlaylists(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Playlists"),
    staleTime: 30_000
  });

  const songs = songsQuery.data ?? [];
  const artists = artistsQuery.data ?? [];
  const albums = albumsQuery.data ?? [];
  const playlists = playlistsQuery.data ?? [];
  const visibleQueries = activeFilter === "All"
    ? [songsQuery, artistsQuery, albumsQuery, playlistsQuery]
    : activeFilter === "Songs" ? [songsQuery]
    : activeFilter === "Artists" ? [artistsQuery]
    : activeFilter === "Albums" ? [albumsQuery] : [playlistsQuery];
  const loading = visibleQueries.some((item) => item.isLoading);
  const error = visibleQueries.find((item) => item.error)?.error;
  const count = activeFilter === "All" ? songs.length + artists.length + albums.length + playlists.length
    : activeFilter === "Songs" ? songs.length
    : activeFilter === "Artists" ? artists.length
    : activeFilter === "Albums" ? albums.length : playlists.length;

  const chooseMood = (moodQuery: string) => {
    setQuery(moodQuery);
    setActiveFilter("All");
    inputRef.current?.blur();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={8}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
      >
        <ScrollReveal scrollY={scrollY}>
          <View style={styles.topLine}>
            <Text style={styles.title}>Search</Text>
            <Pressable style={styles.profileButton} accessibilityRole="button" accessibilityLabel="Your account">
              <Ionicons name="person-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={19} color={colors.muted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for tracks, albums, lyrics..."
              placeholderTextColor={colors.subtle}
              style={styles.input}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Search tracks, albums, lyrics, artists, playlists and videos"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => { setQuery(""); setActiveFilter("All"); inputRef.current?.focus(); }} hitSlop={10}>
                <Ionicons name="close-circle" size={19} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {debouncedQuery ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((filter) => (
                <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, activeFilter === filter && styles.filterActive]}>
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </ScrollReveal>

        {!debouncedQuery ? (
          <ScrollReveal scrollY={scrollY}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Moods & moments</Text>
              <Text style={styles.sectionHint}>Pick a feeling. Find your sound.</Text>
            </View>
            <View style={styles.moodGrid}>
              {moods.map((mood, index) => {
                const art = moodQueries[index]?.data ?? [];
                return (
                  <Pressable key={mood.label} onPress={() => chooseMood(mood.query)} style={[styles.moodCard, { backgroundColor: mood.tint }]}>
                    {art[0]?.artwork ? <Image source={{ uri: art[0].artwork }} style={styles.moodArtwork} /> : null}
                    {art[1]?.artwork ? <Image source={{ uri: art[1].artwork }} style={styles.moodArtworkSmall} /> : null}
                    <View style={styles.moodShade} />
                    <View style={styles.moodCardTop}>
                      <Text style={styles.moodLabel}>{mood.label}</Text>
                      <Ionicons name={mood.icon as never} size={17} color="#FFFFFF" />
                    </View>
                    {art[2]?.artwork ? <Image source={{ uri: art[2].artwork }} style={styles.moodArtworkTiny} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollReveal>
        ) : (
          <ScrollReveal scrollY={scrollY}>
            <View style={styles.resultsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Search results</Text>
                <Text style={styles.sectionHint} numberOfLines={1}>For “{debouncedQuery}”</Text>
              </View>
              {!loading && !error ? <Text style={styles.resultCount}>{count} found</Text> : null}
            </View>
            {loading ? <View style={styles.stateCard}><Ionicons name="search" size={24} color={colors.muted} /><Text style={styles.stateTitle}>Searching everything</Text><Text style={styles.stateText}>Finding tracks, artists, albums and playlists…</Text></View> : null}
            {error ? <View style={styles.stateCard}><Ionicons name="cloud-offline-outline" size={24} color={colors.danger} /><Text style={styles.stateTitle}>Search couldn't load</Text><Text style={styles.stateText}>{error instanceof Error ? error.message : "Check your connection and try again."}</Text></View> : null}
            {!loading && !error && count === 0 ? <View style={styles.stateCard}><Ionicons name="musical-notes-outline" size={25} color={colors.subtle} /><Text style={styles.stateTitle}>No matches yet</Text><Text style={styles.stateText}>Try another title, artist or mood.</Text></View> : null}

            {!loading && !error && (activeFilter === "All" || activeFilter === "Songs") && songs.length > 0 ? (
              <View style={styles.resultGroup}><Text style={styles.groupTitle}>Songs</Text>{songs.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={songs} />)}</View>
            ) : null}
            {!loading && !error && (activeFilter === "All" || activeFilter === "Artists") && artists.length > 0 ? (
              <View style={styles.resultGroup}><Text style={styles.groupTitle}>Artists</Text>{artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)}</View>
            ) : null}
            {!loading && !error && (activeFilter === "All" || activeFilter === "Albums") && albums.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupTitle}>Albums & EPs</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumRail}>
                  {albums.map((album) => (
                    <View key={album.id} style={styles.albumCard}>
                      {album.artwork ? <Image source={{ uri: album.artwork }} style={styles.albumArt} /> : <View style={styles.albumArtFallback}><Ionicons name="disc-outline" size={28} color={colors.muted} /></View>}
                      <Text numberOfLines={2} style={styles.albumTitle}>{album.title}</Text>
                      <Text numberOfLines={1} style={styles.albumSubtitle}>{album.subtitle}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {!loading && !error && (activeFilter === "All" || activeFilter === "Playlists") && playlists.length > 0 ? (
              <View style={styles.resultGroup}><Text style={styles.groupTitle}>Playlists</Text>{playlists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)}</View>
            ) : null}
          </ScrollReveal>
        )}
      </Animated.ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 38 },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9, marginBottom: 18 },
  title: { color: colors.text, fontSize: 31, fontWeight: "800", letterSpacing: -1.1 },
  profileButton: { width: 38, height: 38, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  searchBar: { minHeight: 49, borderRadius: 25, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 11 },
  filters: { gap: 8, paddingTop: 14, paddingBottom: 7 },
  filter: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.surface },
  filterActive: { backgroundColor: colors.surfaceSoft },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: colors.text },
  sectionHeader: { marginTop: 31, marginBottom: 15 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", letterSpacing: -0.5 },
  sectionHint: { color: colors.muted, fontSize: 12, marginTop: 5 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 11 },
  moodCard: { width: "48.5%", height: 104, borderRadius: 15, overflow: "hidden", padding: 13, justifyContent: "space-between" },
  moodArtwork: { position: "absolute", width: 102, height: 102, right: 5, bottom: -8, borderRadius: 15, transform: [{ rotate: "-10deg" }] },
  moodArtworkSmall: { position: "absolute", width: 66, height: 66, right: 58, bottom: 0, borderRadius: 11, transform: [{ rotate: "9deg" }] },
  moodArtworkTiny: { position: "absolute", width: 42, height: 42, right: 12, bottom: 5, borderRadius: 8, transform: [{ rotate: "12deg" }] },
  moodShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.24)" },
  moodCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moodLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 5 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 27, marginBottom: 17 },
  resultCount: { color: colors.subtle, fontSize: 11, fontWeight: "700" },
  stateCard: { minHeight: 160, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 22, gap: 9 },
  stateTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  stateText: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 },
  resultGroup: { marginBottom: 25 },
  groupTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  albumRail: { gap: 13, paddingRight: 12 },
  albumCard: { width: 126 },
  albumArt: { width: 126, height: 126, borderRadius: 12, backgroundColor: colors.surface },
  albumArtFallback: { width: 126, height: 126, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  albumTitle: { color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 8 },
  albumSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 }
}); }
