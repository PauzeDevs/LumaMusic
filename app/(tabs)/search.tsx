import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArtistRow } from "../../components/ArtistRow";
import { PlaylistRow } from "../../components/PlaylistRow";
import { TrackRow } from "../../components/TrackRow";
import { colors } from "../../theme/colors";
import { getTrendingTracks, searchAudiusArtists, searchAudiusPlaylists, searchAudiusTracks } from "../../services/audius";

const filters = ["All", "Tracks", "Artists", "Playlists"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const trackQuery = useQuery({
    queryKey: ["audius", "search", "tracks", debouncedQuery],
    queryFn: () => debouncedQuery ? searchAudiusTracks(debouncedQuery, 25, 0) : getTrendingTracks(8, 0),
    enabled: activeFilter === "All" || activeFilter === "Tracks",
    staleTime: 30_000
  });
  const artistQuery = useQuery({
    queryKey: ["audius", "search", "artists", debouncedQuery],
    queryFn: () => searchAudiusArtists(debouncedQuery, 20, 0),
    enabled: activeFilter === "Artists" && debouncedQuery.length > 0,
    staleTime: 30_000
  });
  const playlistQuery = useQuery({
    queryKey: ["audius", "search", "playlists", debouncedQuery],
    queryFn: () => searchAudiusPlaylists(debouncedQuery, 20, 0),
    enabled: activeFilter === "Playlists" && debouncedQuery.length > 0,
    staleTime: 30_000
  });

  const tracks = trackQuery.data ?? [];
  const artists = artistQuery.data ?? [];
  const playlists = playlistQuery.data ?? [];
  const loading = activeFilter === "Artists" ? artistQuery.isLoading : activeFilter === "Playlists" ? playlistQuery.isLoading : trackQuery.isLoading;
  const error = activeFilter === "Artists" ? artistQuery.error : activeFilter === "Playlists" ? playlistQuery.error : trackQuery.error;
  const count = activeFilter === "Artists" ? artists.length : activeFilter === "Playlists" ? playlists.length : tracks.length;
  const heading = activeFilter === "Artists" ? "Artists" : activeFilter === "Playlists" ? "Playlists" : debouncedQuery ? "Search results" : "Trending on Audius";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>FIND YOUR NEXT FAVOURITE</Text>
        <Text style={styles.title}>Search.</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="What do you want to hear?" placeholderTextColor={colors.subtle} style={styles.input} returnKeyType="search" />
          {query.length > 0 ? <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((filter) => (
            <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filter, activeFilter === filter && styles.filterActive]}>
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{heading}</Text>
          <Text style={styles.count}>{count} {activeFilter.toLowerCase()}</Text>
        </View>
        {loading ? <Text style={styles.message}>Searching the catalogue…</Text> : null}
        {error ? <Text style={styles.error}>{error instanceof Error ? error.message : "Search is unavailable right now."}</Text> : null}
        {!loading && !error && activeFilter !== "Artists" && activeFilter !== "Playlists" && tracks.length > 0
          ? tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />)
          : null}
        {!loading && !error && activeFilter === "Artists" && artists.length > 0
          ? artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)
          : null}
        {!loading && !error && activeFilter === "Playlists" && playlists.length > 0
          ? playlists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)
          : null}
        {!loading && !error && count === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
            <Text style={styles.emptyTitle}>{debouncedQuery ? "Nothing found yet" : "Start with a search"}</Text>
            <Text style={styles.emptyCopy}>{debouncedQuery ? "Try another title, artist, or playlist name." : "Search the Audius catalogue for tracks, artists, and playlists."}</Text>
          </View>
        ) : null}
        <Text style={styles.note}>Search and streaming results are provided by Audius. Track availability varies by artist and permissions.</Text>
      </ScrollView>
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