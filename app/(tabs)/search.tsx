import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mockTracks } from "../../data/mockTracks";
import { TrackRow } from "../../components/TrackRow";
import { colors } from "../../theme/colors";

const filters = ["All", "Tracks", "Artists", "Playlists"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockTracks.slice(0, 4);
    return mockTracks.filter((track) => (track.title + " " + track.artist).toLowerCase().includes(q));
  }, [query]);

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
          <Text style={styles.sectionTitle}>{query ? "Search results" : "A little inspiration"}</Text>
          <Text style={styles.count}>{results.length} tracks</Text>
        </View>
        {results.length ? results.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex />) : (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
            <Text style={styles.emptyTitle}>Nothing found yet</Text>
            <Text style={styles.emptyCopy}>Try another title or artist name.</Text>
          </View>
        )}
        <Text style={styles.note}>Preview catalogue only. Live Audius search is added in the integration phase.</Text>
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
  empty: { alignItems: "center", paddingVertical: 54, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyCopy: { color: colors.muted, fontSize: 12 },
  note: { color: colors.subtle, fontSize: 10, marginTop: 22, lineHeight: 16 }
});