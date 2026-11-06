import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrackRow } from "../../components/TrackRow";
import { colors } from "../../theme/colors";
import { getTrendingTracks, searchAudiusTracks } from "../../services/audius";
import type { MusicTrack } from "../../types/music";

const filters = ["All", "Tracks", "Artists", "Playlists"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (activeFilter === "Artists" || activeFilter === "Playlists") {
      setResults([]);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = query.trim()
          ? await searchAudiusTracks(query, 25, 0)
          : await getTrendingTracks(8, 0);
        if (active) setResults(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Search is unavailable right now.");
      } finally {
        if (active) setLoading(false);
      }
    }, query.trim() ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, activeFilter]);

  const heading = activeFilter === "Artists" ? "Artist search" : activeFilter === "Playlists" ? "Playlist search" : query.trim() ? "Search results" : "Trending on Audius";

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
          <Text style={styles.count}>{results.length} tracks</Text>
        </View>
        {loading ? <Text style={styles.message}>Searching the catalogue…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && results.length > 0 ? results.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={results} />) : null}
        {!loading && !error && results.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
            <Text style={styles.emptyTitle}>{activeFilter === "Artists" || activeFilter === "Playlists" ? "Coming in the next pass" : "Nothing found yet"}</Text>
            <Text style={styles.emptyCopy}>{activeFilter === "Artists" || activeFilter === "Playlists" ? "This result type will be connected to the Audius catalogue." : "Try another title or artist name."}</Text>
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