import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { LiquidGlassView } from "../modules/liquid-glass/src";
import { router } from "expo-router";
import { useTheme } from "../theme/useTheme";
import { Artwork } from "./Artwork";
import { usePlayerStore } from "../store/player";
import { useAudioEngine } from "../providers/AudioPlayerProvider";
import { usePreferencesStore } from "../store/preferences";

const tabs = [
  { name: "index", label: "Listen", icon: "home-outline", activeIcon: "home" },
  { name: "search", label: "Search", icon: "search-outline", activeIcon: "search" },
  { name: "library", label: "Library", icon: "albums-outline", activeIcon: "albums" },
  { name: "profile", label: "You", icon: "person-circle-outline", activeIcon: "person-circle" }
] as const;
type TabBarProps = { state: { index: number; routes: Array<{ name: string }> }; navigation: { navigate: (...args: any[]) => void } };

export function LumaTabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const { togglePlayback } = useAudioEngine();
  const motionStyle = usePreferencesStore((s) => s.motionStyle);
  const progress = playbackDuration > 0 ? Math.min(100, (playbackPosition / playbackDuration) * 100) : 0;
  const tabScales = useRef(tabs.map(() => new Animated.Value(1))).current;
  useEffect(() => {
    if (motionStyle === "off") { tabScales.forEach((value, index) => value.setValue(index === state.index ? 1.04 : 1)); return; }
    const animations = tabScales.map((value, index) => Animated.spring(value, { toValue: index === state.index ? 1.04 : 1, damping: 19, stiffness: 280, mass: 0.7, useNativeDriver: true }));
    Animated.parallel(animations).start();
  }, [state.index, motionStyle, tabScales]);
  const miniEntrance = useRef(new Animated.Value(track ? 1 : 0)).current;
  useEffect(() => {
    if (!track) { miniEntrance.setValue(0); return; }
    if (motionStyle === "off") { miniEntrance.setValue(1); return; }
    miniEntrance.setValue(0);
    const entrance = Animated.spring(miniEntrance, { toValue: 1, damping: motionStyle === "subtle" ? 25 : 19, stiffness: motionStyle === "subtle" ? 145 : 190, mass: 0.8, useNativeDriver: true });
    entrance.start();
    return () => entrance.stop();
  }, [track?.id, motionStyle, miniEntrance]);

  return <View style={styles.wrap}>
    {track ? <Animated.View style={[styles.mini, { opacity: miniEntrance, transform: [{ translateY: miniEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }, { scale: miniEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>
      <LiquidGlassView cornerRadius={19} style={StyleSheet.absoluteFill} />
      <Pressable style={styles.miniMain} onPress={() => router.push("/now-playing")}><Artwork uri={track.artwork} size={42} radius={10} /><View style={styles.miniCopy}><Text numberOfLines={1} style={[styles.miniTitle, { color: colors.text }]}>{track.title}</Text><Text numberOfLines={1} style={[styles.miniArtist, { color: colors.muted }]}>{track.artist}</Text></View></Pressable>
      <Pressable onPress={togglePlayback} hitSlop={12} style={styles.playButton}><Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.text} /></Pressable>
      <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.16)" }]}><View style={[styles.progressFill, { width: (progress + "%") as `${number}%`, backgroundColor: colors.accent }]} /></View>
    </Animated.View> : null}
    <View style={styles.shell}>
      <LiquidGlassView cornerRadius={30} style={StyleSheet.absoluteFill} />
      <View style={styles.tabs}>{tabs.map((tab) => {
        const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
        const focused = state.routes[state.index]?.name === tab.name;
        return <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={[styles.tab, focused && styles.tabActive]}>
          {focused ? <View pointerEvents="none" style={styles.activeHighlight} /> : null}
          <Animated.View style={{ alignItems: "center", gap: 3, transform: [{ scale: tabScales[routeIndex] ?? 1 }] }}>
            <Ionicons name={(focused ? tab.activeIcon : tab.icon) as never} size={19} color={focused ? "#171619" : "rgba(255,255,255,0.68)"} />
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </Animated.View>
        </Pressable>;
      })}</View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  wrap: { marginHorizontal: 18, marginBottom: 8, gap: 7 },
  shell: { borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(25,25,29,0.88)", padding: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 0 },
  mini: { height: 58, paddingHorizontal: 10, borderRadius: 19, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", backgroundColor: "rgba(25,25,29,0.9)", flexDirection: "row", alignItems: "center", gap: 9, overflow: "hidden" },
  miniMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  miniCopy: { flex: 1, gap: 3 }, miniTitle: { fontSize: 13, fontWeight: "700" }, miniArtist: { fontSize: 11 },
  playButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.09)" },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }, progressFill: { height: 2 },
  tabs: { flexDirection: "row", alignItems: "center", gap: 3 },
  tab: { flex: 1, minWidth: 0, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 25, overflow: "hidden" },
  tabActive: { backgroundColor: "#F4F3F4", shadowColor: "#000", shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  activeHighlight: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,255,255,0.18)" },
  label: { color: "rgba(255,255,255,0.68)", fontSize: 9, fontWeight: "600" },
  labelActive: { color: "#171619", fontWeight: "700" }
});
