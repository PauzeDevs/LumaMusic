import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, RefreshControl } from "react-native";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../../components/Artwork";
import { SectionHeading } from "../../components/SectionHeading";
import { TrackRow } from "../../components/TrackRow";
import { ScrollReveal } from "../../components/ScrollReveal";
import { getTrendingPlaylists } from "../../services/audius";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { useLibraryStore } from "../../store/library";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";

export default function LibraryScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const scrollY = useRef(new Animated.Value(0)).current;
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const recentTracks = useLibraryStore((s) => s.recentTracks);
  const localPlaylists = useLibraryStore((s) => s.playlists);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const [createVisible, setCreateVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const { playTrack } = useAudioEngine();
  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["audius", "library-discovery-playlists", 6],
    queryFn: () => getTrendingPlaylists(6, 0)
  });
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Animated.ScrollView onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <ScrollReveal scrollY={scrollY}><View style={styles.top}>
          <View>
            <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
            <Text style={styles.title}>Your library.</Text>
          </View>
          <Pressable style={styles.add} onPress={() => setCreateVisible(true)}><Ionicons name="add" size={24} color={colors.text} /></Pressable>
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.shortcuts}>
          <Pressable style={styles.liked} onPress={() => likedTracks.length ? void playTrack(likedTracks[0], likedTracks).catch((err: unknown) => Alert.alert("Couldn’t play liked songs", err instanceof Error ? err.message : "Try again.")) : Alert.alert("No liked songs yet", "Tap the heart beside any track to save it here.")}>
            <View style={styles.heart}><Ionicons name="heart" size={19} color="#17111F" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shortcutTitle}>Liked songs</Text>
              <Text style={styles.shortcutSub}>Your personal favourites</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.65)" />
          </Pressable>
          <Pressable style={styles.downloads} onPress={() => Alert.alert("Local music", "Device music scanning is planned for a later release.")}>
            <View style={styles.downloadIcon}><Ionicons name="download-outline" size={19} color={colors.mint} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shortcutTitle}>Local music</Text>
              <Text style={styles.shortcutSub}>On this device</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </Pressable>
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.statsCard}>
          <View style={styles.stat}><Text style={styles.statValue}>{recentTracks.length}</Text><Text style={styles.statLabel}>RECENT TRACKS</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{likedTracks.length}</Text><Text style={styles.statLabel}>LIKED SONGS</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{localPlaylists.length}</Text><Text style={styles.statLabel}>PLAYLISTS</Text></View>
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Your playlists" action="Create" onPress={() => setCreateVisible(true)} />
          {localPlaylists.length === 0 ? <Text style={styles.note}>Build your own collections. They stay on this device.</Text> : localPlaylists.map((playlist) => (
            <View key={playlist.id} style={styles.localPlaylist}>
              <View style={styles.localPlaylistIcon}><Ionicons name="albums-outline" size={19} color={colors.accent} /></View>
              <View style={{ flex: 1 }}><Text style={styles.shortcutTitle}>{playlist.name}</Text><Text style={styles.shortcutSub}>{playlist.tracks.length} tracks · On this device</Text></View>
              <Pressable onPress={() => Alert.alert(playlist.name, "Manage this local playlist?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => useLibraryStore.getState().deletePlaylist(playlist.id) }])}><Ionicons name="ellipsis-horizontal" size={19} color={colors.muted} /></Pressable>
            </View>
          ))}
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Discover playlists" action="Search" onPress={() => router.push("/(tabs)/search")} />
          {playlistsLoading ? <Text style={styles.note}>Finding playlists…</Text> : null}
          {playlistsError ? <Text style={styles.note}>Could not load playlists right now.</Text> : null}
          {!playlistsLoading && !playlistsError && playlists.length === 0 ? <Text style={styles.note}>No public playlists are available right now.</Text> : null}
          <View style={styles.playlistGrid}>
            {playlists.map((playlist) => (
              <Pressable key={playlist.id} style={styles.playlist} onPress={() => playlist.sourcePlaylistId ? router.push({ pathname: "/playlist/[id]", params: { id: playlist.sourcePlaylistId } }) : null}>
                <View style={styles.playlistArtwork}><Artwork uri={playlist.artwork} size={156} radius={17} /></View>
                <Text style={styles.playlistTitle}>{playlist.title}</Text>
                <Text style={styles.playlistSub}>{playlist.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Liked songs" />
          {likedTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={likedTracks} />)}
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><View style={styles.section}>
          <SectionHeading title="Recently played" />
          {recentTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={recentTracks} />)}
          {recentTracks.length === 0 ? <Text style={styles.note}>Tracks you play will appear here.</Text> : null}
        </View></ScrollReveal>
        <ScrollReveal scrollY={scrollY}><Text style={styles.note}>Favourites and listening history are saved on this device. Playlists and local music scanning are still being built.</Text></ScrollReveal>
      </Animated.ScrollView>
      <Modal visible={createVisible} transparent animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>YOUR COLLECTION</Text>
            <Text style={styles.modalTitle}>New playlist</Text>
            <TextInput value={playlistName} onChangeText={setPlaylistName} placeholder="Give it a name" placeholderTextColor={colors.subtle} style={styles.modalInput} maxLength={40} autoFocus />
            <Text style={styles.modalHint}>Your playlist is stored locally on this device.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => { setCreateVisible(false); setPlaylistName(""); }} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={() => { const name = playlistName.trim(); if (!name) return; createPlaylist(name); setPlaylistName(""); setCreateVisible(false); }} style={styles.modalCreate}><Text style={styles.modalCreateText}>Create playlist</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
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
  statsCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 17, marginBottom: 27 },
  stat: { alignItems: "center", flex: 1, gap: 5 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.subtle, fontSize: 7, fontWeight: "800", letterSpacing: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  localPlaylist: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 15, marginBottom: 8 },
  localPlaylistIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(198,167,255,0.1)", alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: colors.surfaceElevated, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 20 },
  modalEyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  modalTitle: { color: colors.text, fontSize: 23, fontWeight: "800", marginTop: 7 },
  modalInput: { color: colors.text, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, marginTop: 18, borderWidth: 1, borderColor: colors.border, fontSize: 13 },
  modalHint: { color: colors.subtle, fontSize: 10, lineHeight: 16, marginTop: 10 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 11 },
  modalCancelText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  modalCreate: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.accent },
  modalCreateText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  section: { marginBottom: 28 },
  playlistGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 18 },
  playlist: { width: "48%" },
  playlistArtwork: { marginBottom: 8 },
  playlistTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  playlistSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  note: { color: colors.subtle, fontSize: 10, lineHeight: 16 }
});