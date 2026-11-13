import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../../components/GlassSurface";
import { ArtistRow } from "../../components/ArtistRow";
import { PlaylistRow } from "../../components/PlaylistRow";
import { TrackRow } from "../../components/TrackRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { searchYouTubeMusicArtists, searchYouTubeMusicPlaylists, searchYouTubeMusicTracks } from "../../services/youtubeMusic";

const filters = ["All", "Tracks", "Artists", "Playlists"];
const suggestions = [
  { label: "Punjabi", query: "Punjabi hits", icon: "musical-notes" },
  { label: "Hip-hop", query: "Hip hop", icon: "mic" },
  { label: "Pop", query: "Pop hits", icon: "radio" },
  { label: "Chill", query: "Chill music", icon: "moon" }
] as const;

export default function SearchScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const scrollY = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const trackQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "tracks", debouncedQuery],
    queryFn: () => searchYouTubeMusicTracks(debouncedQuery, 25),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Tracks"),
    staleTime: 30_000
  });
  const artistQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "artists", debouncedQuery],
    queryFn: () => searchYouTubeMusicArtists(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Artists"),
    staleTime: 30_000
  });
  const playlistQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "playlists", debouncedQuery],
    queryFn: () => searchYouTubeMusicPlaylists(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && (activeFilter === "All" || activeFilter === "Playlists"),
    staleTime: 30_000
  });

  const tracks = trackQuery.data ?? [];
  const artists = artistQuery.data ?? [];
  const playlists = playlistQuery.data ?? [];
  const loading = activeFilter === "All"
    ? trackQuery.isLoading || artistQuery.isLoading || playlistQuery.isLoading
    : activeFilter === "Artists" ? artistQuery.isLoading
    : activeFilter === "Playlists" ? playlistQuery.isLoading : trackQuery.isLoading;
  const error = activeFilter === "All"
    ? trackQuery.error || artistQuery.error || playlistQuery.error
    : activeFilter === "Artists" ? artistQuery.error
    : activeFilter === "Playlists" ? playlistQuery.error : trackQuery.error;
  const count = activeFilter === "All" ? tracks.length + artists.length + playlists.length
    : activeFilter === "Artists" ? artists.length
    : activeFilter === "Playlists" ? playlists.length : tracks.length;

  const chooseSuggestion = (value: string) => {
    setQuery(value);
    setActiveFilter("All");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={8}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}
      >
        <ScrollReveal scrollY={scrollY}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>YOUR NEXT FAVOURITE STARTS HERE</Text>
              <Text style={styles.title}>Search</Text>
              <Text style={styles.subtitle}>Find the track. Set the mood.</Text>
            </View>
            <View style={styles.headerGlyph}>
              <Ionicons name="sparkles" size={22} color={colors.accent} />
            </View>
          </View>

          <GlassSurface style={styles.searchShell} contentStyle={styles.searchContent} intensity={55}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Songs, artists, albums..."
              placeholderTextColor={colors.subtle}
              style={styles.input}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => { setQuery(""); inputRef.current?.focus(); }} hitSlop={10} style={styles.clearButton}>
                <Ionicons name="close-circle" size={19} color={colors.muted} />
              </Pressable>
            ) : null}
          </GlassSurface>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {filters.map((filter) => (
              <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, activeFilter === filter && styles.filterActive]}>
                <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollReveal>

        {!debouncedQuery ? (
          <ScrollReveal scrollY={scrollY}>
            <View style={styles.discoveryHeader}>
              <View>
                <Text style={styles.sectionTitle}>Explore by mood</Text>
                <Text style={styles.sectionSubtitle}>A quick way into what you love.</Text>
              </View>
              <Ionicons name="compass-outline" size={20} color={colors.subtle} />
            </View>
            <View style={styles.moodGrid}>
              {suggestions.map((item, index) => (
                <Pressable key={item.label} onPress={() => chooseSuggestion(item.query)} style={[styles.moodCard, index % 2 === 0 ? styles.moodCardWarm : styles.moodCardCool]}>
                  <View style={styles.moodIcon}><Ionicons name={item.icon as never} size={19} color={colors.text} /></View>
                  <Text style={styles.moodLabel}>{item.label}</Text>
                  <Ionicons name="arrow-up-right" size={16} color={colors.muted} style={styles.moodArrow} />
                </Pressable>
              ))}
            </View>
            <GlassSurface style={styles.tipCard} contentStyle={styles.tipContent}>
              <View style={styles.tipIcon}><Ionicons name="headset-outline" size={18} color={colors.accent} /></View>
              <View style={styles.tipCopy}>
                <Text style={styles.tipTitle}>Looking for something specific?</Text>
                <Text style={styles.tipText}>Search by song title, artist name or playlist.</Text>
              </View>
            </GlassSurface>
          </ScrollReveal>
        ) : (
          <ScrollReveal scrollY={scrollY}>
            <View style={styles.resultsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Results</Text>
                <Text style={styles.sectionSubtitle} numberOfLines={1}>For “{debouncedQuery}”</Text>
              </View>
              {!loading && !error ? <Text style={styles.resultCount}>{count} found</Text> : null}
            </View>
            {loading ? (
              <View style={styles.stateCard}>
                <Ionicons name="radio-outline" size={24} color={colors.accent} />
                <Text style={styles.stateTitle}>Finding your music</Text>
                <Text style={styles.stateText}>Searching the catalogue…</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.stateCard}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.danger} />
                <Text style={styles.stateTitle}>Search couldn't load</Text>
                <Text style={styles.stateText}>{error instanceof Error ? error.message : "Check your connection and try again."}</Text>
              </View>
            ) : null}
            {!loading && !error && count === 0 ? (
              <View style={styles.stateCard}>
                <Ionicons name="musical-notes-outline" size={26} color={colors.subtle} />
                <Text style={styles.stateTitle}>No matches yet</Text>
                <Text style={styles.stateText}>Try a different spelling, title or artist.</Text>
              </View>
            ) : null}

            {!loading && !error && (activeFilter === "All" || activeFilter === "Tracks") && tracks.length > 0 ? (
              <View style={styles.resultGroup}>
                <View style={styles.groupHeader}><Text style={styles.groupTitle}>Tracks</Text><Text style={styles.groupCount}>{tracks.length}</Text></View>
                {tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)}
              </View>
            ) : null}
            {!loading && !error && (activeFilter === "All" || activeFilter === "Artists") && artists.length > 0 ? (
              <View style={styles.resultGroup}>
                <View style={styles.groupHeader}><Text style={styles.groupTitle}>Artists</Text><Text style={styles.groupCount}>{artists.length}</Text></View>
                {artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)}
              </View>
            ) : null}
            {!loading && !error && (activeFilter === "All" || activeFilter === "Playlists") && playlists.length > 0 ? (
              <View style={styles.resultGroup}>
                <View style={styles.groupHeader}><Text style={styles.groupTitle}>Playlists</Text><Text style={styles.groupCount}>{playlists.length}</Text></View>
                {playlists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)}
              </View>
            ) : null}
          </ScrollReveal>
        )}
      </Animated.ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 22 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 38, fontWeight: "800", letterSpacing: -1.5, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  headerGlyph: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  searchShell: { height: 58, borderRadius: 18, borderColor: "rgba(255,255,255,0.15)" },
  searchContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 17, gap: 12 },
  input: { color: colors.text, fontSize: 14, flex: 1, paddingVertical: 0 },
  clearButton: { padding: 3 },
  filters: { gap: 8, paddingTop: 17, paddingBottom: 27 },
  filter: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 17, paddingVertical: 9 },
  filterActive: { backgroundColor: "rgba(240,90,104,0.14)", borderColor: "rgba(240,90,104,0.55)" },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: colors.accent },
  discoveryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800", letterSpacing: -0.45 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moodCard: { width: "48.5%", minHeight: 112, borderRadius: 19, borderWidth: 1, borderColor: colors.border, padding: 14, justifyContent: "space-between", overflow: "hidden" },
  moodCardWarm: { backgroundColor: "#211B22" },
  moodCardCool: { backgroundColor: "#171F25" },
  moodIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.075)", alignItems: "center", justifyContent: "center" },
  moodLabel: { color: colors.text, fontSize: 15, fontWeight: "800" },
  moodArrow: { position: "absolute", right: 13, bottom: 14 },
  tipCard: { borderRadius: 18, marginTop: 17 },
  tipContent: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  tipIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(240,90,104,0.12)", alignItems: "center", justifyContent: "center" },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  tipText: { color: colors.muted, fontSize: 10 },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  resultCount: { color: colors.subtle, fontSize: 11, fontWeight: "700" },
  stateCard: { minHeight: 174, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 22, gap: 9 },
  stateTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  stateText: { color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 },
  resultGroup: { marginBottom: 22 },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 9, marginBottom: 5 },
  groupTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  groupCount: { color: colors.subtle, fontSize: 10, fontWeight: "700" }
});
