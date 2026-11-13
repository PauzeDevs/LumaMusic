import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { MusicTrack } from "../types/music";
import { colors } from "../theme/colors";
import { useAccentColor } from "../theme/useAccentColor";
import { usePreferencesStore } from "../store/preferences";
import { Artwork } from "./Artwork";
import { usePlayerStore } from "../store/player";
import { useLibraryStore } from "../store/library";
import { useAudioEngine } from "../providers/AudioPlayerProvider";

type Props = { track: MusicTrack; index?: number; showIndex?: boolean; queue?: MusicTrack[]; playlistId?: string };

export function TrackRow({ track, index, showIndex = false, queue, playlistId }: Props) {
  const accent = useAccentColor();
  const compactRows = usePreferencesStore((state) => state.compactRows);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const likedTracks = useLibraryStore((state) => state.likedTracks);
  const playlists = useLibraryStore((state) => state.playlists);
  const toggleLike = useLibraryStore((state) => state.toggleLike);
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist);
  const removeTrackFromPlaylist = useLibraryStore((state) => state.removeTrackFromPlaylist);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { playTrack } = useAudioEngine();
  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTracks.some((item) => item.id === track.id);

  const handlePlay = () => {
    playTrack(track, queue ?? [track]).catch((error: unknown) => {
      Alert.alert("Couldn't open this track", error instanceof Error ? error.message : "Please try again.");
    });
  };

  const handleCollectionAction = () => {
    if (playlistId) {
      Alert.alert("Remove from playlist?", "This only removes the track from this local playlist.", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeTrackFromPlaylist(playlistId, track.id) }
      ]);
      return;
    }
    if (playlists.length === 0) {
      Alert.alert("No playlists yet", "Create a playlist in Your Library first.");
      return;
    }
    setPickerVisible(true);
  };

  return (
    <View style={[styles.row, compactRows && styles.compactRow]}>
      {showIndex ? <Text style={[styles.index, isCurrent && { color: accent }]}>{String((index ?? 0) + 1).padStart(2, "0")}</Text> : null}
      <Pressable onPress={handlePlay} style={styles.main}>
        <Artwork uri={track.artwork} size={52} radius={12} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, isCurrent && styles.active]}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
        </View>
      </Pressable>
      <Pressable hitSlop={10} style={styles.more} onPress={handleCollectionAction} accessibilityRole="button" accessibilityLabel={playlistId ? "Remove from playlist" : "Add to playlist"}>
        <Ionicons name={playlistId ? "remove-circle-outline" : "add-circle-outline"} size={20} color={colors.muted} />
      </Pressable>
      <Pressable hitSlop={10} style={styles.more} onPress={() => toggleLike(track)} accessibilityRole="button" accessibilityLabel={isLiked ? "Unlike track" : "Like track"}>
        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={19} color={isLiked ? accent : colors.muted} />
      </Pressable>
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to playlist</Text>
            <Text numberOfLines={1} style={styles.modalSubtitle}>{track.title}</Text>
            <ScrollView style={styles.playlistOptions} keyboardShouldPersistTaps="handled">
              {playlists.map((playlist) => (
                <Pressable key={playlist.id} style={styles.playlistOption} onPress={() => {
                  addTrackToPlaylist(playlist.id, track);
                  setPickerVisible(false);
                }}>
                  <Ionicons name="albums-outline" size={18} color={colors.accent} />
                  <View style={styles.playlistCopy}>
                    <Text numberOfLines={1} style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistCount}>{playlist.tracks.length} tracks</Text>
                  </View>
                  <Ionicons name="add" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPickerVisible(false)}><Text style={styles.modalCloseText}>Cancel</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8 },
  compactRow: { paddingVertical: 3 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  index: { width: 22, color: colors.subtle, fontSize: 12, fontWeight: "700" },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  title: { color: colors.text, fontSize: 14, fontWeight: "600" },
  artist: { color: colors.muted, fontSize: 12 },
  active: { color: colors.accent },
  more: { padding: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", justifyContent: "center", padding: 22 },
  modalCard: { maxHeight: "75%", backgroundColor: colors.surfaceElevated, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18 },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, fontSize: 11, marginTop: 5, marginBottom: 14 },
  playlistOptions: { flexGrow: 0 },
  playlistOption: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  playlistCopy: { flex: 1 },
  playlistName: { color: colors.text, fontSize: 12, fontWeight: "700" },
  playlistCount: { color: colors.subtle, fontSize: 10, marginTop: 3 },
  modalClose: { alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 10, marginTop: 8 },
  modalCloseText: { color: colors.muted, fontSize: 11, fontWeight: "700" }
});