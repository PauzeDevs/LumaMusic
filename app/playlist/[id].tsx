import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrackRow } from "../../components/TrackRow";
import { Artwork } from "../../components/Artwork";
import { getYouTubeMusicPlaylistTracks } from "../../services/youtubeMusic";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { useLibraryStore } from "../../store/library";
import { useTheme } from "../../theme/useTheme";
import type { MusicTrack } from "../../types/music";

export default function PlaylistScreen() {
  const { colors } = useTheme();
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

  const tracks: MusicTrack[] = localPlaylist?.tracks ?? remoteTracks;
  const loading = remotePlaylist && remoteTracksQuery.isLoading;
  const failed = remotePlaylist && remoteTracksQuery.isError;

  const emptyContent = localPlaylist ? (
    <View style={makeStyles(colors).empty}>
      <Ionicons name="add-circle-outline" size={30} color={colors.subtle} />
      <Text style={makeStyles(colors).emptyTitle}>Your playlist is empty</Text>
      <Text style={makeStyles(colors).emptyCopy}>Search for tracks, then tap the add icon beside a song to save it here.</Text>
      <Pressable style={makeStyles(colors).secondaryButton} onPress={() => router.push("/(tabs)/search")}><Text style={makeStyles(colors).secondaryText}>Find tracks</Text></Pressable>
    </View>
  ) : loading ? (
    <Text style={makeStyles(colors).emptyCopy}>Fetching playlist tracks…</Text>
  ) : failed ? (
    <View style={makeStyles(colors).empty}>
      <Ionicons name="cloud-offline-outline" size={30} color={colors.subtle} />
      <Text style={makeStyles(colors).emptyTitle}>Playlist unavailable</Text>
      <Text style={makeStyles(colors).emptyCopy}>The catalogue didn't return this playlist. Check your connection and try opening it again later.</Text>
    </View>
  ) : (
    <View style={makeStyles(colors).empty}>
      <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
      <Text style={makeStyles(colors).emptyTitle}>No tracks found</Text>
      <Text style={makeStyles(colors).emptyCopy}>This playlist may be private, unavailable, or unsupported by the catalogue.</Text>
    </View>
  );

  return (
    <SafeAreaView style={makeStyles(colors).safe} edges={["top", "bottom"]}>
      <View style={makeStyles(colors).header}>
        <Pressable onPress={() => router.back()} style={makeStyles(colors).back}><Ionicons name="chevron-back" size={22} color={colors.text} /><Text style={makeStyles(colors).backText}>Back</Text></Pressable>
        {localPlaylist ? <View style={makeStyles(colors).headerActions}>
          <Pressable onPress={() => { setDraftName(localPlaylist.name); setRenameVisible(true); }} style={makeStyles(colors).headerAction}><Ionicons name="pencil-outline" size={18} color={colors.muted} /></Pressable>
          <Pressable onPress={confirmDelete} style={makeStyles(colors).headerAction}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
        </View> : null}
      </View>
      <FlatList<MusicTrack>
        data={tracks}
        keyExtractor={(track) => track.id}
        renderItem={({ item, index }) => <TrackRow track={item} index={index} showIndex queue={tracks} playlistId={localPlaylist?.id} />}
        contentContainerStyle={makeStyles(colors).content}
        ListHeaderComponent={
          <View>
            <View style={makeStyles(colors).hero}>
              {localPlaylist ? <View style={makeStyles(colors).artwork}><Ionicons name="musical-notes" size={43} color={colors.accent} /></View>
                : remoteArtwork ? <Artwork uri={remoteArtwork} size={112} radius={22} />
                : <View style={makeStyles(colors).artwork}><Ionicons name="musical-notes" size={43} color={colors.accent} /></View>}
              <Text style={makeStyles(colors).title}>{localPlaylist?.name ?? remoteTitle}</Text>
              <Text style={makeStyles(colors).copy}>
                {localPlaylist
                  ? localPlaylist.tracks.length + " tracks · Stored on this device"
                  : loading ? "Loading tracks from the music catalogue…"
                  : failed ? "Couldn't load this playlist right now."
                  : tracks.length + " tracks · Available in LumaMusic"}
              </Text>
              <Pressable disabled={tracks.length === 0} style={[makeStyles(colors).primaryButton, tracks.length === 0 && makeStyles(colors).disabled]} onPress={playAll}>
                <Ionicons name="play" size={16} color="#17111F" /><Text style={makeStyles(colors).primaryText}>Play all</Text>
              </Pressable>
            </View>
            {!localPlaylist && loading ? null : !localPlaylist && failed ? null : tracks.length > 0 ? (
              <View style={makeStyles(colors).sectionHeader}><Text style={makeStyles(colors).sectionTitle}>Tracks</Text><Text style={makeStyles(colors).count}>{tracks.length}</Text></View>
            ) : null}
          </View>
        }
        ListEmptyComponent={emptyContent}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={makeStyles(colors).modalBackdrop}>
          <View style={makeStyles(colors).modalCard}>
            <Text style={makeStyles(colors).modalTitle}>Rename playlist</Text>
            <TextInput value={draftName} onChangeText={setDraftName} placeholder="Playlist name" placeholderTextColor={colors.subtle} maxLength={50} autoFocus style={makeStyles(colors).modalInput} />
            <View style={makeStyles(colors).modalActions}>
              <Pressable onPress={() => setRenameVisible(false)} style={makeStyles(colors).modalCancel}><Text style={makeStyles(colors).modalCancelText}>Cancel</Text></Pressable>
              <Pressable onPress={() => {
                const nextName = draftName.trim();
                if (!nextName || !localPlaylist) return;
                renamePlaylist(localPlaylist.id, nextName);
                setRenameVisible(false);
              }} style={makeStyles(colors).modalSave}><Text style={makeStyles(colors).modalSaveText}>Save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
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