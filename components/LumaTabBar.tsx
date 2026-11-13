import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { colors } from "../theme/colors";
import { useAccentColor } from "../theme/useAccentColor";
import { Artwork } from "./Artwork";
import { usePlayerStore } from "../store/player";
import { useAudioEngine } from "../providers/AudioPlayerProvider";

const tabs = [
  { name: "index", label: "Listen", icon: "home-outline", activeIcon: "home" },
  { name: "search", label: "Search", icon: "search-outline", activeIcon: "search" },
  { name: "library", label: "Library", icon: "albums-outline", activeIcon: "albums" },
  { name: "profile", label: "You", icon: "person-circle-outline", activeIcon: "person-circle" }
] as const;

type TabBarProps = { state: { index: number; routes: Array<{ name: string }> }; navigation: { navigate: (...args: any[]) => void } };

export function LumaTabBar({ state, navigation }: TabBarProps) {
  const accent = useAccentColor();
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const { togglePlayback } = useAudioEngine();
  const progress = playbackDuration > 0 ? Math.min(100, (playbackPosition / playbackDuration) * 100) : 0;

  return (
    <View style={styles.shell}>
      <BlurView tint="dark" intensity={75} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.shellSheen} />
      {track ? (
        <View style={styles.mini}>
          <Pressable style={styles.miniMain} onPress={() => router.push("/now-playing")}>
            <Artwork uri={track.artwork} size={42} radius={10} />
            <View style={styles.miniCopy}>
              <Text numberOfLines={1} style={styles.miniTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.miniArtist}>{track.artist}</Text>
            </View>
          </Pressable>
          <Pressable onPress={togglePlayback} hitSlop={12} style={styles.playButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>
      ) : null}
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
          const focused = state.index === routeIndex;
          return (
            <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={styles.tab}>
              <Ionicons name={(focused ? tab.activeIcon : tab.icon) as never} size={21} color={focused ? accent : colors.subtle} />
              <Text style={[styles.label, focused && { color: accent }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginHorizontal: 12, marginBottom: 8, borderRadius: 25, overflow: "hidden", backgroundColor: "rgba(18,20,25,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", paddingTop: 9, paddingBottom: 10, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  shellSheen: { position: "absolute", top: 0, left: 18, right: 18, height: 1, backgroundColor: "rgba(255,255,255,0.24)" },
  mini: { height: 60, marginHorizontal: 9, marginBottom: 8, paddingHorizontal: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.17)", flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden" },
  miniMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  miniCopy: { flex: 1, gap: 3 },
  miniTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  miniArtist: { color: colors.muted, fontSize: 10 },
  playButton: { padding: 8 },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  progressFill: { width: "28%", height: 2, backgroundColor: accent },
  tabs: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  tab: { alignItems: "center", gap: 4, minWidth: 58 },
  label: { color: colors.subtle, fontSize: 10, fontWeight: "600" },
  labelActive: { color: colors.accent }
});