import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { TrackRow } from "../../components/TrackRow";
import { PlaylistRecommendations } from "../../components/PlaylistRecommendations";
import { Artwork } from "../../components/Artwork";
import { getYouTubeMusicPlaylistTracks } from "../../services/youtubeMusic";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { useLibraryStore } from "../../store/library";
import { useTheme } from "../../theme/useTheme";
import type { MusicTrack } from "../../types/music";

const MAX_COVER_BYTES = 15 * 1024 * 1024;

export default function PlaylistScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ id: string; title?: string; artwork?: string }>();
  const id = String(params.id ?? "");
  const localPlaylist = useLibraryStore((state) => state.playlists.find((playlist) => playlist.id === id));
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);
  const renamePlaylist = useLibraryStore((state) => state.renamePlaylist);
  const setPlaylistArtwork = useLibraryStore((state) => state.setPlaylistArtwork);
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
  const tracks: MusicTrack[] = localPlaylist?.tracks ?? remoteTracks;
  const loading = remotePlaylist && remoteTracksQuery.isLoading;
  const failed = remotePlaylist && remoteTracksQuery.isError;
  const coverUri = localPlaylist?.artwork || remoteArtwork || tracks[0]?.artwork || "";
  const playlistName = localPlaylist?.name ?? remoteTitle;

  const playWithQueue = (queue: MusicTrack[]) => {
    if (queue.length === 0) return;
    playTrack(queue[0], queue).catch((error: unknown) => {
      Alert.alert("Couldn't start playlist", error instanceof Error ? error.message : "Please try again.");
    });
  };

  const playAll = () => playWithQueue(tracks);

  const shuffleAndPlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    playWithQueue(shuffled);
  };

  const chooseCover = async () => {
    if (!localPlaylist) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.mimeType && !asset.mimeType.startsWith("image/")) {
        Alert.alert("Unsupported image", "Choose a JPG, PNG, or another image file.");
        return;
      }
      if (typeof asset.size === "number" && asset.size > MAX_COVER_BYTES) {
        Alert.alert("Image is too large", "Choose an image smaller than 15 MB.");
        return;
      }
      const source = new File(asset.uri);
      if (source.size && source.size > MAX_COVER_BYTES) {
        Alert.alert("Image is too large", "Choose an image smaller than 15 MB.");
        return;
      }
      const extensionFromName = asset.name?.match(/\.(jpe?g|png|webp|heic)$/i)?.[1]?.toLowerCase();
      const extensionFromType = asset.mimeType?.split("/")[1]?.replace("jpeg", "jpg");
      const extension = extensionFromName || extensionFromType || "jpg";
      const folder = new Directory(Paths.document, "playlist-covers");
      folder.create({ idempotent: true, intermediates: true });
      const destination = new File(folder, "cover-" + localPlaylist.id.replace(/[^a-zA-Z0-9_-]/g, "") + "-" + Date.now() + "." + extension);
      await source.copy(destination);
      setPlaylistArtwork(localPlaylist.id, destination.uri);
      Alert.alert("Playlist cover updated", "Your image is saved on this device and will stay with this playlist.");
    } catch (error) {
      Alert.alert("Couldn't update cover", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const removeCover = () => {
    if (!localPlaylist?.artwork) return;
    Alert.alert("Remove custom cover?", "The playlist will use its default artwork again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setPlaylistArtwork(localPlaylist.id, null) }
    ]);
  };

  const confirmDelete = () => {
    if (!localPlaylist) return;
    Alert.alert("Delete playlist?", "This permanently removes the local playlist from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deletePlaylist(localPlaylist.id); router.back(); } }
    ]);
  };

  const emptyContent = localPlaylist ? (
    <View style={styles.empty}>
      <Ionicons name="add-circle-outline" size={30} color={colors.subtle} />
      <Text style={styles.emptyTitle}>Your playlist is empty</Text>
      <Text style={styles.emptyCopy}>Search for tracks, then add songs to build this playlist.</Text>
      <Pressable style={styles.secondaryButton} onPress={() => router.push("/(tabs)/search")}>
        <Text style={styles.secondaryText}>Find tracks</Text>
      </Pressable>
    </View>
  ) : loading ? (
    <Text style={styles.emptyCopy}>Fetching playlist tracks…</Text>
  ) : failed ? (
    <View style={styles.empty}>
      <Ionicons name="cloud-offline-outline" size={30} color={colors.subtle} />
      <Text style={styles.emptyTitle}>Playlist unavailable</Text>
      <Text style={styles.emptyCopy}>The catalogue didn't return this playlist. Check your connection and try again later.</Text>
    </View>
  ) : (
    <View style={styles.empty}>
      <Ionicons name="musical-notes-outline" size={30} color={colors.subtle} />
      <Text style={styles.emptyTitle}>No tracks found</Text>
      <Text style={styles.emptyCopy}>This playlist may be private, unavailable, or unsupported by the catalogue.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {localPlaylist ? (
          <View style={styles.headerActions}>
            <Pressable onPress={chooseCover} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Change playlist cover">
              <Ionicons name="image-outline" size={19} color={colors.muted} />
            </Pressable>
            <Pressable onPress={() => { setDraftName(localPlaylist.name); setRenameVisible(true); }} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Rename playlist">
              <Ionicons name="pencil-outline" size={18} color={colors.muted} />
            </Pressable>
            <Pressable onPress={confirmDelete} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Delete playlist">
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <FlatList<MusicTrack>
        data={tracks}
        keyExtractor={(track) => track.id}
        renderItem={({ item, index }) => <TrackRow track={item} index={index} showIndex queue={tracks} playlistId={localPlaylist?.id} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              {coverUri ? (
                <View style={styles.coverFrame}>
                  <Image source={{ uri: coverUri }} style={styles.coverGlow} blurRadius={28} />
                  <Image source={{ uri: coverUri }} style={styles.cover} />
                </View>
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="musical-notes" size={48} color={colors.accent} />
                </View>
              )}
              {localPlaylist?.artwork ? (
                <Pressable style={styles.coverEdit} onPress={chooseCover} accessibilityRole="button" accessibilityLabel="Change custom playlist cover">
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                  <Text style={styles.coverEditText}>CUSTOM COVER</Text>
                </Pressable>
              ) : null}
              <Text numberOfLines={3} style={styles.title}>{playlistName}</Text>
              <Text style={styles.copy}>
                {localPlaylist
                  ? tracks.length + " tracks · Your library"
                  : loading ? "Loading tracks from the music catalogue…"
                  : failed ? "Couldn't load this playlist right now."
                  : tracks.length + " tracks · Available in LumaMusic"}
              </Text>
              <View style={styles.primaryControls}>
                <Pressable disabled={tracks.length === 0} style={[styles.primaryButton, tracks.length === 0 && styles.disabled]} onPress={playAll}>
                  <Ionicons name="play" size={17} color="#17111F" />
                  <Text style={styles.primaryText}>Play</Text>
                </Pressable>
                <Pressable disabled={tracks.length === 0} style={[styles.secondaryControl, tracks.length === 0 && styles.disabled]} onPress={shuffleAndPlay}>
                  <Ionicons name="shuffle" size={17} color={colors.text} />
                  <Text style={styles.secondaryControlText}>Shuffle</Text>
                </Pressable>
              </View>
              <View style={styles.utilityControls}>
                <Pressable style={styles.utilityButton} onPress={() => router.push("/(tabs)/search")}>
                  <Ionicons name="add" size={18} color={colors.accent} />
                  <Text style={styles.utilityText}>Add tracks</Text>
                </Pressable>
                {localPlaylist?.artwork ? (
                  <Pressable style={styles.utilityButton} onPress={removeCover}>
                    <Ionicons name="image" size={16} color={colors.muted} />
                    <Text style={styles.utilityMutedText}>Reset cover</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {localPlaylist ? <PlaylistRecommendations playlist={localPlaylist} /> : null}
            {!localPlaylist && loading ? null : !localPlaylist && failed ? null : tracks.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tracks</Text>
                <Text style={styles.count}>{tracks.length}</Text>
              </View>
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
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename playlist</Text>
            <TextInput value={draftName} onChangeText={setDraftName} placeholder="Playlist name" placeholderTextColor={colors.subtle} maxLength={50} autoFocus style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setRenameVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => {
                const nextName = draftName.trim();
                if (!nextName || !localPlaylist) return;
                renamePlaylist(localPlaylist.id, nextName);
                setRenameVisible(false);
              }} style={styles.modalSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerAction: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingBottom: 38 },
  hero: { alignItems: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 22, marginTop: 4, marginBottom: 22, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  coverFrame: { width: 196, height: 196, marginBottom: 19, alignItems: "center", justifyContent: "center" },
  coverGlow: { position: "absolute", width: 196, height: 196, borderRadius: 28, opacity: 0.5 },
  cover: { width: 176, height: 176, borderRadius: 23, backgroundColor: colors.surfaceElevated },
  coverPlaceholder: { width: 176, height: 176, borderRadius: 23, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center", marginBottom: 19 },
  coverEdit: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.68)", marginTop: -14, marginBottom: 13 },
  coverEditText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  copy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7 },
  primaryControls: { width: "100%", flexDirection: "row", gap: 10, marginTop: 19 },
  primaryButton: { flex: 1, minHeight: 47, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: colors.accent, paddingHorizontal: 16, borderRadius: 15 },
  secondaryControl: { flex: 1, minHeight: 47, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, borderRadius: 15 },
  disabled: { opacity: 0.4 },
  primaryText: { color: "#17111F", fontWeight: "800", fontSize: 12 },
  secondaryControlText: { color: colors.text, fontWeight: "700", fontSize: 12 },
  utilityControls: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 13 },
  utilityButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  utilityText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  utilityMutedText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  count: { color: colors.subtle, fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.surface, borderRadius: 18, marginTop: 12 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 12 },
  emptyCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 7 },
  secondaryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: colors.surfaceElevated, marginTop: 15 },
  secondaryText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: colors.surfaceElevated, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18 },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  modalInput: { color: colors.text, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12, marginTop: 15 },
  modalActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 15 },
  modalCancel: { paddingHorizontal: 13, paddingVertical: 10 },
  modalCancelText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  modalSave: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 11, backgroundColor: colors.accent },
  modalSaveText: { color: "#17111F", fontSize: 11, fontWeight: "800" }
});
