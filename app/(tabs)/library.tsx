import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { SectionHeading } from "../../components/SectionHeading";
import { TrackRow } from "../../components/TrackRow";
import { mockPlaylists } from "../../data/mockTracks";
import { colors } from "../../theme/colors";
import { useLibraryStore } from "../../store/library";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";

export default function LibraryScreen() {
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const recentTracks = useLibraryStore((s) => s.recentTracks);
  const { playTrack } = useAudioEngine();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View>
            <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
            <Text style={styles.title}>Your library.</Text>
          </View>
          <Pressable style={styles.add} onPress={() => Alert.alert("Create a playlist", "Playlist creation and local storage will be connected after the UI phase.")}><Ionicons name="add" size={24} color={colors.text} /></Pressable>
        </View>
        <View style={styles.shortcuts}>
          <Pressable style={styles.liked} onPress={() => likedTracks.length ? void playTrack(likedTracks[0], likedTracks).catch((err: unknown) => Alert.alert("Couldn’t play liked songs", err instanceof Error ? err.message : "Try again.")) : Alert.alert("No liked songs yet", "Tap the heart beside any track to save it here.")}>
            <View style={styles.heart}><Ionicons name="heart" size={19} color="#17111F" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shortcutTitle}>Liked songs</Text>
              <Text style={styles.shortcutSub}>Your personal favourites</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.65)" />
          </Pressable>
          <Pressable style={styles.downloads} onPress={() => Alert.alert("Local music", "Device music scanning will be added after the online music source is integrated.")}>
            <View style={styles.downloadIcon}><Ionicons name="download-outline" size={19} color={colors.mint} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shortcutTitle}>Local music</Text>
              <Text style={styles.shortcutSub}>On this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </Pressable>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Your playlists" action="Create" onPress={() => Alert.alert("Create a playlist", "Playlist creation and local storage will be connected after the UI phase.")} />
          <View style={styles.playlistGrid}>
            {mockPlaylists.map((playlist, index) => (
              <Pressable key={playlist.id} style={styles.playlist} onPress={() => Alert.alert(playlist.title, "Playlist playback will be connected after the Audius playlist endpoints are added.")}>
                <View style={styles.playlistArtwork}><Artwork uri={playlist.artwork} size={156} radius={17} /></View>
                <Text style={styles.playlistTitle}>{playlist.title}</Text>
                <Text style={styles.playlistSub}>{playlist.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Liked songs" />
          {likedTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={likedTracks} />)}
        </View>
        <View style={styles.section}>
          <SectionHeading title="Recently played" />
          {recentTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={recentTracks} />)}
          {recentTracks.length === 0 ? <Text style={styles.note}>Tracks you play will appear here.</Text> : null}
        </View>
        <Text style={styles.note}>Favourites and listening history are saved on this device. Playlists and local music scanning are still being built.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 22 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 6 },
  add: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  shortcuts: { gap: 10, marginBottom: 30 },
  liked: { minHeight: 76, borderRadius: 17, padding: 14, backgroundColor: "#29213A", flexDirection: "row", alignItems: "center", gap: 12 },
  heart: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  downloads: { minHeight: 76, borderRadius: 17, padding: 14, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border },
  downloadIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#182D2A", alignItems: "center", justifyContent: "center" },
  shortcutTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  shortcutSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  section: { marginBottom: 28 },
  playlistGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 18 },
  playlist: { width: "48%" },
  playlistArtwork: { marginBottom: 8 },
  playlistTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  playlistSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  note: { color: colors.subtle, fontSize: 10, lineHeight: 16 }
});