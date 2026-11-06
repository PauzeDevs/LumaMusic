import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mockPlaylists, mockTracks } from "../../data/mockTracks";
import { colors } from "../../theme/colors";
import { Artwork } from "../../components/Artwork";
import { SectionHeading } from "../../components/SectionHeading";
import { TrackRow } from "../../components/TrackRow";
import { usePlayerStore } from "../../store/player";

export default function ListenScreen() {
  const setTrack = usePlayerStore((s) => s.setTrack);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View>
            <Text style={styles.eyebrow}>YOUR SOUND, YOUR SPACE</Text>
            <Text style={styles.greeting}>Good evening.</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.avatarText}>P</Text>
          </Pressable>
        </View>

        <Pressable style={styles.searchPrompt} onPress={() => router.push("/(tabs)/search")}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <Text style={styles.searchText}>Songs, artists, moods...</Text>
          <Ionicons name="options-outline" size={18} color={colors.subtle} />
        </Pressable>

        <View style={styles.hero}>
          <Image source={{ uri: mockPlaylists[0].artwork }} style={styles.heroImage} />
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}><View style={styles.dot} /><Text style={styles.heroTagText}>YOUR DAILY ESCAPE</Text></View>
            <Text style={styles.heroTitle}>Find your{ "\n" }next frequency.</Text>
            <Text style={styles.heroSub}>A softer place to land.</Text>
            <Pressable style={styles.heroButton} onPress={() => setTrack(mockTracks[0], mockTracks)}>
              <Ionicons name="play" size={15} color="#101018" />
              <Text style={styles.heroButtonText}>Start listening</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Made for your mood" action="Explore" onPress={() => router.push("/(tabs)/search")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
            {mockPlaylists.map((playlist, index) => (
              <Pressable key={playlist.id} style={styles.playlistCard} onPress={() => setTrack(mockTracks[index], mockTracks)}>
                <Artwork uri={playlist.artwork} size={148} radius={18} />
                <Text numberOfLines={1} style={styles.cardTitle}>{playlist.title}</Text>
                <Text numberOfLines={1} style={styles.cardSubtitle}>{playlist.subtitle}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeading title="On repeat" action="See all" onPress={() => router.push("/(tabs)/library")} />
          {mockTracks.slice(0, 4).map((track, index) => <TrackRow key={track.id} track={track} index={index} showIndex />)}
        </View>

        <View style={styles.sourceNote}>
          <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
          <Text style={styles.sourceText}>A little discovery, powered by independent artists.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 22 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  greeting: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#272333", borderWidth: 1, borderColor: "rgba(198,167,255,0.35)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  searchPrompt: { height: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 },
  searchText: { color: colors.muted, fontSize: 13, flex: 1 },
  hero: { height: 260, borderRadius: 24, overflow: "hidden", marginBottom: 30, backgroundColor: "#252035" },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.65 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,8,15,0.38)" },
  heroContent: { flex: 1, padding: 22, justifyContent: "flex-end" },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  heroTagText: { color: "#E7DDF9", fontSize: 9, fontWeight: "800", letterSpacing: 1.7 },
  heroTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 8 },
  heroButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  heroButtonText: { color: "#17111F", fontSize: 11, fontWeight: "800" },
  section: { marginBottom: 30 },
  horizontal: { gap: 14, paddingRight: 20 },
  playlistCard: { width: 148 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 9 },
  cardSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sourceNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  sourceText: { color: colors.subtle, fontSize: 11 }
});