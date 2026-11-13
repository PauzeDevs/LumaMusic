import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrackRow } from "../../components/TrackRow";
import { Artwork } from "../../components/Artwork";
import { getYouTubeMusicPlaylistTracks } from "../../services/youtubeMusic";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { useLibraryStore } from "../../store/library";
import { colors } from "../../theme/colors";

export default function PlaylistScreen() {
  const params = useLocalSearchParams<{ id: string; title?: string; artwork?: string }>();
  const id = String(params.id ?? "");
  const localPlaylist = useLibraryStore((state) => state.playlists.find((playlist) => playlist.id === id));
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);
  const renamePlaylist = useLibraryStore((state) => state.renamePlaylist);
  const [renameVisible, setRenameVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const { playTrack } = useAudioEngine();
  const remoteTitle = String(params.title ?? "Playlist");
  const remoteArtwork = String(params.artwork ?? "");
  const remotePlaylist = !localPlaylist && Boolean(id);
  const remoteTracksQuery = useQuery({
    queryKey: ["youtubeMusic", "playlist", id],
    queryFn: () => getYouTubeMusicPlaylistTracks(id),
    enabled: remotePlaylist,
    staleTime: 5 * 60 * 1000
  });
  const remoteTracks = remoteTracksQuery.data ?? [];

  const playAll = () => {
    const tracks = localPlaylist?.tracks ?? remoteTracks;
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks).catch((error: unknown) => {
      Alert.alert("Couldn't start playlist", error instanceof Error ? error.message : "Please try again.");
    });
  };

  const confirmDelete = () => {
    if (!localPlaylist) return;
    Alert.alert("Delete playlist?", "This permanently removes the local playlist from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deletePlaylist(localPlaylist.id); router.back(); } }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={styles.backText}>Back</Text></Pressable>
        {localPlaylist ? <View style={styles.headerActions}>
          <Pressable onPress={() => { setDraftName(localPlaylist.name); setRenameVisible(true); }} style={styles.headerAction}><Ionicons name="pencil-outline" size={18} color={colors.muted} /></Pressable>
          <Pressable onPress={confirmDelete} style={styles.headerAction}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
        </View> : null}
      </View>
      {localPlaylist ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.artwork}><Ionicons name="musical-notes" size={43} color={colors.accent} /></View>
            <Text style={styles.title}>{localPlaylist.name}</Text>
            <Text style={styles.copy}>{localPlaylist.tracks.length} tracks · Stored on this device</Text>
            <Pressable disabled={localPlaylist.tracks.length === 0} style={[styles.primaryButton, localPlaylist.tracks.length === 0 && styles.disabled]} onPress={playAll}>
              <Ionicons name="play" size={16} color="#17111F" /><Text style={styles.primaryText}>Play all</Text>
            </Pressable>
          </View>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tracks</Text><Text style={styles.count}>{localPlaylist.tracks.length}</Text></View>
          {localPlaylist.tracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={localPlaylist.tracks} playlistId={localPlaylist.id} />)}
          {localPlaylist.tracks.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="add-circle-outline" size={30} color={colors.subtle} />
              <Text style={styles.emptyTitle}>Your playlist is empty</Text>
              <Text style={styles.emptyCopy}>Search for tracks, then tap the add icon beside a song to save it here.</Text>
              <Pressable style={styles.secondaryButton} onPress={() => router.push("/(tabs)/search")}><Text style={styles.secondaryText}>Find tracks</Text></Pressable>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            {remoteArtwork ? <Artwork uri={remoteArtwork} size={112} radius={22} /> : <View style={styles.artwork}><Ionicons name="musical-notes" size={43} color={colors.accent} /></View>}
            <Text style={styles.title}>{remoteTitle}</Text>
            <Text style={styles.copy}>{remoteTracksQuery.isLoading ? "Loading tracks from the music catalogue…" : remoteTracksQuery.isError ? "Couldn't load this playlist right now." : remoteTracks.length + " tracks · Available in LumaMusic"}</Text>
            <Pressable disabled={remoteTracks.length === 0} style={[styles.primaryButton, remoteTracks.length === 0 && styles.disabled]} onPress={playAll}>
              <Ionicons name="play" size={16} color="#17111F" /><Text style={styles.primaryText}>Play all</Text>
            </Pressable>
          </View>
          {remoteTracksQuery.isLoading ? <Text style={styles.emptyCopy}>Fetching playlist tracks…</Text> : null}
          {remoteTracksQuery.isError ? <View style={styles.empty}><Ionicons name="cloud-offline-outline" size={30} color={colors.subtle} /><Text style={styles.emptyTitle}>Playlist unavailable</Text><Text style={styles.emptyCopy}>The catalogue didn't return this playlist. Check your connection and try opening it again later.</Text></View> : null}
          {!remoteTracksQuery.isLoading && !remoteTracksQuery.isError && remoteTracks.length > 0 ? <View>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tracks</Text><Text style={styles.count}>{remoteTracks.length}</Text></View>
            {remoteTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex queue={remoteTracks} />)}
          </View> : null}
          {!remoteTracksQuery.isLoading && !remoteTracksQuery.isError && remoteTracks.length === 0 ? <View style={styles.empty}><Ionicons name="musical-notes-outline" size={30} color={colors.subtle} /><Text style={styles.emptyTitle}>No tracks found</Text><Text style={styles.emptyCopy}>This playlist may be private, unavailable, or unsupported by the catalogue.</Text></View> : null}
        </ScrollView>
      )}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename playlist</Text>
            <TextInput value={draftName} onChangeText={setDraftName} placeholder="Playlist name" placeholderTextColor={colors.subtle} maxLength={50} autoFocus style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRenameVisible(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={() => {
                const nextName = draftName.trim();
                if (!nextName || !localPlaylist) return;
                renamePlaylist(localPlaylist.id, nextName);
                setRenameVisible(false);
              }} style={styles.modalSave}><Text style={styles.modalSaveText}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  header: { minHeight: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 10 },
  backText: { color: colors.muted, fontSize: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 3 },
  headerAction: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: colors.surfaceElevated, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  modalInput: { color: colors.text, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12, marginTop: 15 },
  modalActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 15 },
  modalCancel: { paddingHorizontal: 13, paddingVertical: 10 },
  modalCancelText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  modalSave: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: colors.accent },
  modalSaveText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  content: { paddingHorizontal: 20, paddingBottom: 35 },
  hero: { alignItems: "center", padding: 22, marginTop: 10, marginBottom: 24, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  artwork: { width: 100, height: 100, borderRadius: 24, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  copy: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 8 },
  primaryButton: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, paddingHorizontal: 19, borderRadius: 13, marginTop: 17 },
  disabled: { opacity: 0.4 },
  primaryText: { color: "#17111F", fontWeight: "800", fontSize: 11 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  count: { color: colors.subtle, fontSize: 11 },
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.surface, borderRadius: 18, marginTop: 12 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7 },
  secondaryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: colors.surfaceElevated, marginTop: 15 },
  secondaryText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  remoteNote: { color: colors.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 15 }
});