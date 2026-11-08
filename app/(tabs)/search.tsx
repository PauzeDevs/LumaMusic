import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArtistRow } from "../../components/ArtistRow";
import { PlaylistRow } from "../../components/PlaylistRow";
import { TrackRow } from "../../components/TrackRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { searchYouTubeMusicArtists, searchYouTubeMusicPlaylists, searchYouTubeMusicTracks } from "../../services/youtubeMusic";

const filters = ["All", "Tracks", "Artists", "Playlists"];

export default function SearchScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const scrollY = useRef(new Animated.Value(0)).current;
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
    enabled: Boolean(debouncedQuery) && activeFilter === "Artists",
    staleTime: 30_000
  });
  const playlistQuery = useQuery({
    queryKey: ["youtubeMusic", "search", "playlists", debouncedQuery],
    queryFn: () => searchYouTubeMusicPlaylists(debouncedQuery, 20),
    enabled: Boolean(debouncedQuery) && activeFilter === "Playlists",
    staleTime: 30_000
  });
  const tracks = trackQuery.data ?? [];
  const artists = artistQuery.data ?? [];
  const playlists = playlistQuery.data ?? [];
  const loading = activeFilter === "Artists" ? artistQuery.isLoading : activeFilter === "Playlists" ? playlistQuery.isLoading : trackQuery.isLoading;
  const error = activeFilter === "Artists" ? artistQuery.error : activeFilter === "Playlists" ? playlistQuery.error : trackQuery.error;
  const count = activeFilter === "Artists" ? artists.length : activeFilter === "Playlists" ? playlists.length : tracks.length;
  const heading = activeFilter === "Artists" ? "Artists" : activeFilter === "Playlists" ? "Playlists" : "Search results";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.ScrollView onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <ScrollReveal scrollY={scrollY}>
          <Text style={styles.eyebrow}>YOUTUBE MUSIC CATALOGUE</Text>
          <Text style={styles.title}>Search.</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="search" size={19} color={colors.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Songs, artists, albums..." placeholderTextColor={colors.subtle} style={styles.input} returnKeyType="search" />
            {query.length > 0 ? <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {filters.map((filter) => <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, activeFilter === filter && styles.filterActive]}>
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>)}
          </ScrollView>
        </ScrollReveal>
        <ScrollReveal scrollY={scrollY}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{debouncedQuery ? heading : "Find something to play"}</Text><Text style={styles.count}>{count} {activeFilter.toLowerCase()}</Text></View>
          {!debouncedQuery ? <Text style={styles.message}>Search YouTube Music by track, artist or playlist.</Text> : null}
          {loading ? <Text style={styles.message}>Searching YouTube Music…</Text> : null}
          {error ? <Text style={styles.error}>{error instanceof Error ? error.message : "Search is unavailable right now."}</Text> : null}
          {!loading && !error && (activeFilter === "All" || activeFilter === "Tracks") ? tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />) : null}
          {!loading && !error && activeFilter === "Artists" ? artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />) : null}
          {!loading && !error && activeFilter === "Playlists" ? playlists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />) : null}
          {debouncedQuery && !loading && !error && count === 0 ? <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
            <Text style={styles.emptyTitle}>Nothing found yet</Text>
            <Text style={styles.emptyCopy}>Try another title, artist or playlist name.</Text>
          </View> : null}
          <Text style={styles.note}>Selecting a track opens its canonical YouTube Music page. Native in-app streaming is a separate playback milestone.</Text>
        </ScrollReveal>
      </Animated.ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 12 },
  title: { color: colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -1.2, marginTop: 6, marginBottom: 20 },
  inputWrap: { height: 54, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15 },
  input: { color: colors.text, fontSize: 13, flex: 1, paddingVertical: 0 },
  filters: { gap: 8, paddingVertical: 18 },
  filter: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: "#17111F" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  count: { color: colors.subtle, fontSize: 11 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  error: { color: colors.danger, fontSize: 12, paddingVertical: 18 },
  empty: { alignItems: "center", paddingVertical: 54, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: "center" },
  note: { color: colors.subtle, fontSize: 10, marginTop: 22, lineHeight: 16 }
});
