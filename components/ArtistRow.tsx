import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";
import type { MusicArtist } from "../types/music";
import { Artwork } from "./Artwork";

export function ArtistRow({ artist }: { artist: MusicArtist }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: "/artist/[id]", params: { id: artist.sourceArtistId, name: artist.name, artwork: artist.artwork } })}
    >
      <Artwork uri={artist.artwork} size={54} radius={27} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{artist.name}</Text>
        <Text numberOfLines={1} style={styles.handle}>{artist.handle ? "@" + artist.handle : "YouTube Music artist"}{artist.trackCount > 0 ? " · " + artist.trackCount + " tracks" : ""}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
return StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  copy: { flex: 1, gap: 4 },
  name: { color: c.text, fontSize: 14, fontWeight: "700" },
  handle: { color: c.muted, fontSize: 11 }
});
}