import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import type { MusicPlaylist } from "../types/music";
import { Artwork } from "./Artwork";

export function PlaylistRow({ playlist }: { playlist: MusicPlaylist }) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => playlist.sourcePlaylistId ? router.push({ pathname: "/playlist/[id]", params: { id: playlist.sourcePlaylistId, title: playlist.title, artwork: playlist.artwork } }) : undefined}
    >
      <Artwork uri={playlist.artwork} size={58} radius={13} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{playlist.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{playlist.subtitle}{playlist.trackCount && playlist.trackCount > 0 ? " · " + playlist.trackCount + " tracks" : ""}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11 }
});