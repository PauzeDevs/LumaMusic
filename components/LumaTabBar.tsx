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
  const { colors, isDark, surfaceStyle } = useTheme();
  const showLiquidGlass = surfaceStyle === "liquid";
  const isFrosted = surfaceStyle === "frosted";
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const { togglePlayback } = useAudioEngine();
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const progress = playbackDuration > 0 ? Math.min(100, (playbackPosition / playbackDuration) * 100) : 0;
  const miniEntrance = useRef(new Animated.Value(track ? 1 : 0)).current;
  useEffect(() => {
    if (!track) { miniEntrance.setValue(0); return; }
    if (motionStyle === "off") { miniEntrance.setValue(1); return; }
    miniEntrance.setValue(0);
    const entrance = Animated.spring(miniEntrance, {
      toValue: 1,
      damping: motionStyle === "subtle" ? 25 : 19,
      stiffness: motionStyle === "subtle" ? 145 : 190,
      mass: 0.8,
      useNativeDriver: true
    });
    entrance.start();
    return () => entrance.stop();
  }, [track?.id, motionStyle, miniEntrance]);
  return <View style={[styles.shell, { backgroundColor: surfaceStyle === "matte" ? colors.surfaceElevated : isFrosted ? (isDark ? "rgba(28,28,32,0.94)" : "rgba(248,248,250,0.96)") : isDark ? "rgba(18,18,22,0.48)" : "rgba(255,255,255,0.52)", borderColor: colors.border }]}>
    {showLiquidGlass ? <LiquidGlassView cornerRadius={30} style={[StyleSheet.absoluteFill, { opacity: 0.82 }]} /> : null}
    {surfaceStyle === "liquid" ? <View pointerEvents="none" style={[styles.shellSheen, { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.72)" }]} /> : null}
    {track ? <Animated.View style={[styles.mini, { opacity: miniEntrance, transform: [{ translateY: miniEntrance.interpolate({ inputRange: [0, 1], outputRange: [13, 0] }) }, { scale: miniEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) }], backgroundColor: surfaceStyle === "matte" ? colors.surface : isFrosted ? (isDark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.72)") : isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.28)", borderColor: colors.border }]}>
      {showLiquidGlass ? <LiquidGlassView cornerRadius={18} style={[StyleSheet.absoluteFill, { opacity: 0.62 }]} /> : null}
      <Pressable style={styles.miniMain} onPress={() => router.push("/now-playing")}><Artwork uri={track.artwork} size={42} radius={10} /><View style={styles.miniCopy}><Text numberOfLines={1} style={[styles.miniTitle, { color: colors.text }]}>{track.title}</Text><Text numberOfLines={1} style={[styles.miniArtist, { color: colors.muted }]}>{track.artist}</Text></View></Pressable>
      <Pressable onPress={togglePlayback} hitSlop={12} style={styles.playButton}><Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.text} /></Pressable>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} /></View>
    </Animated.View> : null}
    <View style={styles.tabs}>{tabs.map((tab) => {
      const routeIndex = state.routes.findIndex((route) => route.name === tab.name);
      const focused = state.index === routeIndex;
      return <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={[styles.tab, focused && { backgroundColor: surfaceStyle === "matte" ? colors.surfaceSoft : isFrosted ? (isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.055)") : isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.72)", borderColor: surfaceStyle === "matte" ? colors.border : isFrosted ? "transparent" : isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.9)" }]}>
          {showLiquidGlass ? <LiquidGlassView cornerRadius={19} style={StyleSheet.absoluteFill} /> : null}
          <Ionicons name={(focused ? tab.activeIcon : tab.icon) as never} size={21} color={focused ? colors.text : colors.subtle} />
        <Text style={[styles.label, { color: focused ? colors.text : colors.subtle }]}>{tab.label}</Text>
      </Pressable>;
    })}</View>
  </View>;
}
const styles = StyleSheet.create({
  shellSheen: { position: "absolute", top: 0, left: 18, right: 18, height: 1 },
  shell: { marginHorizontal: 14, marginBottom: 6, borderRadius: 25, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 8, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 10 },
  mini: { height: 56, marginHorizontal: 8, marginBottom: 7, paddingHorizontal: 9, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 9, overflow: "hidden" },
  miniMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }, miniCopy: { flex: 1, gap: 3 },
  miniTitle: { fontSize: 13, fontWeight: "700" }, miniArtist: { fontSize: 11 }, playButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }, progressFill: { height: 2 },
  tabs: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingTop: 2, paddingHorizontal: 8, gap: 5 }, tab: { flex: 1, height: 54, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 4, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent", overflow: "hidden" }, label: { fontSize: 11, fontWeight: "600" }
});
