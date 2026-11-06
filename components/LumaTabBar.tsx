import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "../theme/colors";
import { Artwork } from "./Artwork";
import { usePlayerStore } from "../store/player";

const tabs = [
  { name: "index", label: "Listen", icon: "home-outline", activeIcon: "home" },
  { name: "search", label: "Search", icon: "search-outline", activeIcon: "search" },
  { name: "library", label: "Library", icon: "albums-outline", activeIcon: "albums" },
  { name: "profile", label: "You", icon: "person-circle-outline", activeIcon: "person-circle" }
] as const;

type TabBarProps = { state: { index: number; routes: Array<{ name: string }> }; navigation: { navigate: (...args: any[]) => void } };

export function LumaTabBar({ state, navigation }: TabBarProps) {
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayback = usePlayerStore((s) => s.togglePlayback);

  return (
    <View style={styles.shell}>
      {track ? (
        <Pressable style={styles.mini} onPress={() => router.push("/now-playing")}>
          <Artwork uri={track.artwork} size={42} radius={10} />
          <View style={styles.miniCopy}>
            <Text numberOfLines={1} style={styles.miniTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.miniArtist}>{track.artist}</Text>
          </View>
          <Pressable onPress={togglePlayback} hitSlop={12} style={styles.playButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.text} />
          </Pressable>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        </Pressable>
      ) : null}
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
          const focused = state.index === routeIndex;
          return (
            <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={styles.tab}>
              <Ionicons name={(focused ? tab.activeIcon : tab.icon) as never} size={21} color={focused ? colors.accent : colors.subtle} />
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: "#0B0C12", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingBottom: 8 },
  mini: { height: 58, marginHorizontal: 12, marginBottom: 7, paddingHorizontal: 9, borderRadius: 15, backgroundColor: "#1B1E29", flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden" },
  miniCopy: { flex: 1, gap: 3 },
  miniTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  miniArtist: { color: colors.muted, fontSize: 10 },
  playButton: { padding: 8 },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  progressFill: { width: "28%", height: 2, backgroundColor: colors.accent },
  tabs: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  tab: { alignItems: "center", gap: 4, minWidth: 58 },
  label: { color: colors.subtle, fontSize: 10, fontWeight: "600" },
  labelActive: { color: colors.accent }
});