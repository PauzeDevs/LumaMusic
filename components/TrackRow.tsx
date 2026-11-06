import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MusicTrack } from "../types/music";
import { colors } from "../theme/colors";
import { Artwork } from "./Artwork";
import { usePlayerStore } from "../store/player";

type Props = { track: MusicTrack; index?: number; showIndex?: boolean };

export function TrackRow({ track, index, showIndex = false }: Props) {
  const setTrack = usePlayerStore((state) => state.setTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const likedTrackIds = usePlayerStore((state) => state.likedTrackIds);
  const toggleLike = usePlayerStore((state) => state.toggleLike);
  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTrackIds.includes(track.id);

  return (
    <View style={styles.row}>
      {showIndex ? <Text style={[styles.index, isCurrent && styles.active]}>{String((index ?? 0) + 1).padStart(2, "0")}</Text> : null}
      <Pressable onPress={() => setTrack(track)} style={styles.main}>
        <Artwork uri={track.artwork} size={52} radius={12} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, isCurrent && styles.active]}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
        </View>
      </Pressable>
      <Pressable hitSlop={10} style={styles.more} onPress={() => toggleLike(track.id)}>
        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={19} color={isLiked ? colors.accent : colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  index: { width: 22, color: colors.subtle, fontSize: 12, fontWeight: "700" },
  copy: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: "600" },
  artist: { color: colors.muted, fontSize: 12 },
  active: { color: colors.accent },
  more: { padding: 8 }
});