import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { parsePlaylistExport, type ImportedPlaylistEntry } from "../services/playlistImport";
import { searchYouTubeMusicTracks } from "../services/youtubeMusic";
import type { MusicTrack } from "../types/music";
import { useLibraryStore } from "../store/library";

type Match = { entry: ImportedPlaylistEntry; track: MusicTrack };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarity(left: string, right: string): number {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  let overlap = 0;
  aWords.forEach((word) => { if (bWords.has(word)) overlap += 1; });
  return overlap / Math.max(aWords.size, bWords.size);
}

export default function ImportPlaylistScreen() {
  const [playlistName, setPlaylistName] = useState("Imported playlist");
  const [rawText, setRawText] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist);

  const previewMatches = async () => {
    const entries = parsePlaylistExport(rawText);
    if (entries.length === 0) {
      Alert.alert("No tracks found", "Paste a CSV export or a track list with one song per line. Use the format Song Title - Artist.");
      return;
    }
    setIsMatching(true);
    setMatches([]);
    setUnmatched([]);
    setPreviewed(false);
    setProgress(0);
    const found: Match[] = [];
    const missing: string[] = [];

    for (let index = 0; index < entries.length; index += 3) {
      const batch = entries.slice(index, index + 3);
      const results = await Promise.all(batch.map(async (entry) => {
        try {
          const query = [entry.title, entry.artist].filter(Boolean).join(" ");
          const candidates = await searchYouTubeMusicTracks(query, 6);
          const ranked = candidates.map((track) => {
            const titleScore = similarity(entry.title, track.title);
            const artistScore = entry.artist ? similarity(entry.artist, track.artist) : 0.5;
            return { track, score: titleScore * 0.82 + artistScore * 0.18 };
          }).sort((a, b) => b.score - a.score);
          const best = ranked[0];
          const hasArtist = Boolean(entry.artist.trim());
          const isConfidentMatch = Boolean(best && best.score >= 0.76 && similarity(entry.title, best.track.title) >= 0.72 && (!hasArtist || similarity(entry.artist, best.track.artist) >= 0.5));
          return isConfidentMatch && best ? { entry, track: best.track } as Match : null;
        } catch {
          return null;
        }
      }));
      results.forEach((result, batchIndex) => {
        if (result) found.push(result);
        else missing.push(batch[batchIndex].title);
      });
      setProgress(Math.min(entries.length, index + batch.length));
    }

    setMatches(found);
    setUnmatched(missing);
    setPreviewed(true);
    setIsMatching(false);
  };

  const savePlaylist = () => {
    if (matches.length === 0) return;
    const name = playlistName.trim() || "Imported playlist";
    createPlaylist(name);
    const created = useLibraryStore.getState().playlists[0];
    if (!created) {
      Alert.alert("Couldn't create playlist", "Please try again.");
      return;
    }
    matches.forEach((match) => addTrackToPlaylist(created.id, match.track));
    router.replace({ pathname: "/playlist/[id]", params: { id: created.id, title: created.name } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>MOVE YOUR COLLECTION</Text><Text style={styles.title}>Import playlist</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Ionicons name="swap-horizontal" size={24} color={colors.accent} />
          <Text style={styles.introTitle}>Bring your playlists over.</Text>
          <Text style={styles.introCopy}>Paste a CSV export or a plain track list. LumaMusic searches its catalogue and builds a local playlist from the tracks it can match.</Text>
          <Pressable style={styles.helpLink} onPress={() => void Linking.openURL("https://www.tunemymusic.com/")}>
            <Text style={styles.helpText}>Open TuneMyMusic to export a playlist</Text>
            <Ionicons name="open-outline" size={14} color={colors.accent} />
          </Pressable>
        </View>
        <Text style={styles.label}>PLAYLIST NAME</Text>
        <TextInput value={playlistName} onChangeText={setPlaylistName} placeholder="Imported playlist" placeholderTextColor={colors.subtle} style={styles.nameInput} maxLength={50} />
        <Text style={styles.label}>PLAYLIST EXPORT</Text>
        <TextInput
          value={rawText}
          onChangeText={(value) => { setRawText(value); setPreviewed(false); }}
          multiline
          textAlignVertical="top"
          placeholder={'Paste CSV contents or one track per line:\nSong Title - Artist\nAnother Song - Another Artist'}
          placeholderTextColor={colors.subtle}
          style={styles.textInput}
          autoCapitalize="sentences"
        />
        <Text style={styles.helper}>Supports common CSV column names such as Track Name / Artist Name(s), plus plain text lists. Up to 100 tracks per import.</Text>
        <Pressable style={[styles.primaryButton, (!rawText.trim() || isMatching) && styles.disabledButton]} disabled={!rawText.trim() || isMatching} onPress={() => void previewMatches()}>
          {isMatching ? <ActivityIndicator color="#17111F" /> : <Ionicons name="search" size={17} color="#17111F" />}
          <Text style={styles.primaryText}>{isMatching ? "Matching " + progress + " tracks…" : "Preview track matches"}</Text>
        </Pressable>

        {previewed ? (
          <View style={styles.results}>
            <Text style={styles.resultTitle}>{matches.length} matched · {unmatched.length} not found</Text>
            {matches.slice(0, 12).map((match, index) => (
              <View key={match.track.id + "-" + index} style={styles.resultRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.mint} />
                <View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.resultTrack}>{match.track.title}</Text><Text numberOfLines={1} style={styles.resultArtist}>{match.track.artist}</Text></View>
              </View>
            ))}
            {matches.length > 12 ? <Text style={styles.helper}>And {matches.length - 12} more matched tracks.</Text> : null}
            {unmatched.length > 0 ? <Text style={styles.unmatched}>Not found: {unmatched.slice(0, 8).join(", ")}{unmatched.length > 8 ? "…" : ""}</Text> : null}
            <Pressable style={[styles.primaryButton, matches.length === 0 && styles.disabledButton]} disabled={matches.length === 0} onPress={savePlaylist}>
              <Ionicons name="add-circle-outline" size={17} color="#17111F" />
              <Text style={styles.primaryText}>Create playlist with {matches.length} tracks</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.disclaimer}>Import matches catalogue entries. It does not copy audio files, subscription access, or private account data. Review matches before saving.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  back: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 3 },
  content: { paddingHorizontal: 20, paddingBottom: 36 },
  introCard: { padding: 18, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 23 },
  introTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  introCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  helpLink: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", marginTop: 3 },
  helpText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  label: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8, marginTop: 12 },
  nameInput: { color: colors.text, backgroundColor: colors.surface, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, fontSize: 12 },
  textInput: { minHeight: 180, maxHeight: 270, color: colors.text, backgroundColor: colors.surface, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: colors.border, fontSize: 11, lineHeight: 17 },
  helper: { color: colors.subtle, fontSize: 10, lineHeight: 15, marginTop: 8 },
  primaryButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.accent, marginTop: 17 },
  disabledButton: { opacity: 0.45 },
  primaryText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  results: { marginTop: 22, padding: 15, backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border },
  resultTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 9 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7 },
  resultTrack: { color: colors.text, fontSize: 11, fontWeight: "700" },
  resultArtist: { color: colors.muted, fontSize: 10, marginTop: 2 },
  unmatched: { color: colors.subtle, fontSize: 10, lineHeight: 16, marginTop: 10 },
  disclaimer: { color: colors.subtle, fontSize: 9, lineHeight: 15, marginTop: 20, textAlign: "center" }
});