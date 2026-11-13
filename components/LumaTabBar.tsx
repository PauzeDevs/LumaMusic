import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useTheme } from "../theme/useTheme";
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
  const { colors, blurTint, isDark } = useTheme();
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const { togglePlayback } = useAudioEngine();
  const progress = playbackDuration > 0 ? Math.min(100, (playbackPosition / playbackDuration) * 100) : 0;
  return <View style={[styles.shell, { backgroundColor: isDark ? "rgba(28,28,30,0.88)" : "rgba(255,255,255,0.88)", borderColor: colors.border }]}>
    <BlurView tint={blurTint} intensity={88} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.shellSheen, { backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.9)" }]} />
    {track ? <View style={[styles.mini, { backgroundColor: isDark ? "rgba(255,255,255,0.075)" : "rgba(0,0,0,0.035)", borderColor: colors.border }]}>
      <Pressable style={styles.miniMain} onPress={() => router.push("/now-playing")}><Artwork uri={track.artwork} size={42} radius={10} /><View style={styles.miniCopy}><Text numberOfLines={1} style={[styles.miniTitle, { color: colors.text }]}>{track.title}</Text><Text numberOfLines={1} style={[styles.miniArtist, { color: colors.muted }]}>{track.artist}</Text></View></Pressable>
      <Pressable onPress={togglePlayback} hitSlop={12} style={styles.playButton}><Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.text} /></Pressable>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} /></View>
    </View> : null}
    <View style={styles.tabs}>{tabs.map((tab) => {
      const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
      const focused = state.index === routeIndex;
      return <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={styles.tab}>
        <Ionicons name={(focused ? tab.activeIcon : tab.icon) as never} size={21} color={focused ? colors.accent : colors.subtle} />
        <Text style={[styles.label, { color: focused ? colors.accent : colors.subtle }]}>{tab.label}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
const styles = StyleSheet.create({
  shell: { marginHorizontal: 12, marginBottom: 8, borderRadius: 25, overflow: "hidden", borderWidth: 1, paddingTop: 9, paddingBottom: 10, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  shellSheen: { position: "absolute", top: 0, left: 18, right: 18, height: 1 },
  mini: { height: 60, marginHorizontal: 9, marginBottom: 8, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden" },
  miniMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }, miniCopy: { flex: 1, gap: 3 },
  miniTitle: { fontSize: 12, fontWeight: "700" }, miniArtist: { fontSize: 10 }, playButton: { padding: 8 },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }, progressFill: { height: 2 },
  tabs: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 }, tab: { alignItems: "center", gap: 4, minWidth: 58 }, label: { fontSize: 10, fontWeight: "600" }
});
