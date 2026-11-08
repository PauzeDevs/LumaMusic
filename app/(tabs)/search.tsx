import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrackRow } from "../../components/TrackRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { searchYouTubeMusicTracks } from "../../services/youtubeMusic";

export default function SearchScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useQuery({
    queryKey: ["youtubeMusic", "search", debouncedQuery],
    queryFn: () => searchYouTubeMusicTracks(debouncedQuery, 25),
    enabled: debouncedQuery.length > 0,
    staleTime: 30_000
  });
  const tracks = result.data ?? [];
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
        </ScrollReveal>
        <ScrollReveal scrollY={scrollY}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{debouncedQuery ? "Search results" : "Find a track"}</Text><Text style={styles.count}>{tracks.length} tracks</Text></View>
          {result.isLoading ? <Text style={styles.message}>Searching YouTube Music…</Text> : null}
          {result.error ? <Text style={styles.error}>{result.error instanceof Error ? result.error.message : "Search is unavailable right now."}</Text> : null}
          {!result.isLoading && !result.error ? tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={tracks} />) : null}
          {!result.isLoading && !result.error && tracks.length === 0 ? <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
            <Text style={styles.emptyTitle}>{debouncedQuery ? "Nothing found yet" : "Start with a search"}</Text>
            <Text style={styles.emptyCopy}>{debouncedQuery ? "Try another title or artist name." : "Search YouTube Music for tracks from across its catalogue."}</Text>
          </View> : null}
          <Text style={styles.note}>Selecting a result opens its canonical YouTube Music page. Native in-app streaming is a separate playback milestone.</Text>
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
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 25, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  count: { color: colors.subtle, fontSize: 11 },
  message: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
  error: { color: colors.danger, fontSize: 12, paddingVertical: 18 },
  empty: { alignItems: "center", paddingVertical: 54, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: "center" },
  note: { color: colors.subtle, fontSize: 10, marginTop: 22, lineHeight: 16 }
});
