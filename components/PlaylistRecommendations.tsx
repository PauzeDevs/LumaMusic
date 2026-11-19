import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Artwork } from "./Artwork";
import { searchYouTubeMusicTracks } from "../services/youtubeMusic";
import { useLibraryStore, type LocalPlaylist } from "../store/library";
import { usePreferencesStore } from "../store/preferences";
import { useTheme } from "../theme/useTheme";
import type { MusicTrack } from "../types/music";

type Props = { playlist: LocalPlaylist };

const RANDOM_DISCOVERY_QUERIES = [
  "new popular songs mix",
  "Punjabi hits playlist",
  "indie pop discoveries",
  "trending hip hop songs",
  "chill electronic music",
  "classic pop hits",
  "Afrobeats hits",
  "rock essentials"
];

async function loadRecommendations(playlist: LocalPlaylist): Promise<MusicTrack[]> {
  const existingIds = new Set(playlist.tracks.map((track) => track.id));
  let candidates: MusicTrack[] = [];

  if (playlist.tracks.length > 0) {
    const seeds = [...playlist.tracks].slice(-3).reverse();
    const results = await Promise.all(seeds.map((track) => {
      const identity = [track.artist, track.title].filter(Boolean).join(" ");
      return searchYouTubeMusicTracks(identity + " similar songs", 8).catch(() => []);
    }));
    candidates = results.flat();
  } else {
    const query = RANDOM_DISCOVERY_QUERIES[Math.floor(Math.random() * RANDOM_DISCOVERY_QUERIES.length)];
    candidates = await searchYouTubeMusicTracks(query, 18);
  }

  const seen = new Set(existingIds);
  return candidates.filter((track) => {
    if (!track?.id || seen.has(track.id) || track.source === "local") return false;
    seen.add(track.id);
    return true;
  }).slice(0, 12);
}

function RecommendationCard({ track, index, motionStyle, styles, onAdd }: {
  track: MusicTrack;
  index: number;
  motionStyle: "full" | "subtle" | "off";
  styles: ReturnType<typeof makeStyles>;
  onAdd: () => void;
}) {
  const entrance = useRef(new Animated.Value(motionStyle === "off" ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    entrance.stopAnimation();
    if (motionStyle === "off") { entrance.setValue(1); return; }
    entrance.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 1, delay: Math.min(index, 7) * (motionStyle === "subtle" ? 28 : 52), duration: motionStyle === "subtle" ? 230 : 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, index, motionStyle]);
  const press = (pressed: boolean) => {
    if (motionStyle === "off") return;
    Animated.spring(scale, { toValue: pressed ? 0.965 : 1, damping: 17, stiffness: 330, useNativeDriver: true }).start();
  };
  return <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [motionStyle === "subtle" ? 5 : 18, 0] }) }, { scale: Animated.multiply(entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }), scale) }] }}>
    <View style={styles.card}>
      <Artwork uri={track.artwork} size={116} radius={14} />
      <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
      <Pressable style={styles.add} onPress={onAdd} onPressIn={() => press(true)} onPressOut={() => press(false)} accessibilityRole="button" accessibilityLabel={"Add " + track.title + " to playlist"}>
        <Ionicons name="add" size={15} color="#17111F" /><Text style={styles.addText}>Add</Text>
      </Pressable>
    </View>
  </Animated.View>;
}

export function PlaylistRecommendations({ playlist }: Props) {
  const { colors } = useTheme();
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist);
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const refreshRotation = useRef(new Animated.Value(0)).current;
  const trackSignature = useMemo(() => playlist.tracks.map((track) => track.id).join("|"), [playlist.tracks]);
  const query = useQuery({
    queryKey: ["playlist-recommendations", playlist.id, trackSignature],
    queryFn: () => loadRecommendations(playlist),
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const styles = makeStyles(colors);

  useEffect(() => {
    refreshRotation.stopAnimation();
    if (!query.isFetching || motionStyle === "off") { refreshRotation.setValue(0); return; }
    const spin = Animated.loop(Animated.timing(refreshRotation, { toValue: 1, duration: 850, easing: Easing.linear, useNativeDriver: true }));
    spin.start();
    return () => spin.stop();
  }, [motionStyle, query.isFetching, refreshRotation]);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Made for this playlist</Text>
          <Text style={styles.subtitle}>{playlist.tracks.length ? "Inspired by the songs you've added" : "A few discoveries to get you started"}</Text>
        </View>
        <Pressable onPress={() => void query.refetch()} disabled={query.isFetching} hitSlop={10} style={styles.refresh} accessibilityRole="button" accessibilityLabel="Refresh recommendations">
          {query.isFetching ? <ActivityIndicator size="small" color={colors.accent} /> : <Animated.View style={{ transform: [{ rotate: refreshRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}><Ionicons name="refresh" size={17} color={colors.accent} /></Animated.View>}
        </Pressable>
      </View>
      {query.isLoading ? (
        <View style={styles.state}><ActivityIndicator color={colors.accent} /><Text style={styles.stateText}>Finding your next favourites…</Text></View>
      ) : query.isError ? (
        <View style={styles.state}><Text style={styles.stateText}>Recommendations aren't available right now.</Text><Pressable onPress={() => void query.refetch()}><Text style={styles.retry}>Try again</Text></Pressable></View>
      ) : query.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {query.data.map((track, index) => (
            <RecommendationCard key={track.id} track={track} index={index} motionStyle={motionStyle} styles={styles} onAdd={() => addTrackToPlaylist(playlist.id, track)} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.state}><Text style={styles.stateText}>No recommendations found. Try refreshing.</Text></View>
      )}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  section: { marginBottom: 24 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  headingCopy: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 10 },
  refresh: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  cards: { gap: 12, paddingRight: 20 },
  card: { width: 132, padding: 8, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  trackTitle: { color: colors.text, fontSize: 11, fontWeight: "800", marginTop: 9 },
  artist: { color: colors.muted, fontSize: 10, marginTop: 3 },
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 30, marginTop: 9, borderRadius: 10, backgroundColor: colors.accent },
  addText: { color: "#17111F", fontSize: 10, fontWeight: "800" },
  state: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, padding: 14, borderRadius: 15, backgroundColor: colors.surface },
  stateText: { color: colors.muted, fontSize: 10 },
  retry: { color: colors.accent, fontSize: 10, fontWeight: "800" }
});
