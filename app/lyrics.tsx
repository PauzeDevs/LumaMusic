import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Artwork } from "../components/Artwork";
import { getLyrics, type LyricsState } from "../services/lyrics";
import { usePlayerStore } from "../store/player";
import type { ThemePalette } from "../theme/colors";
import { useTheme } from "../theme/useTheme";

export default function LyricsScreen() {
  const { colors, blurTint } = useTheme();
  const styles = createStyles(colors);
  const track = usePlayerStore((state) => state.currentTrack);
  const position = usePlayerStore((state) => state.playbackPosition);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const [lyrics, setLyrics] = useState<LyricsState>({ status: "unconfigured" });
  const scrollRef = useRef<ScrollView>(null);
  const lineOffsets = useRef<number[]>([]);
  const isSynced = lyrics.status === "available" && lyrics.lines.some((line) => line.time !== null);
  const activeIndex = useMemo(() => {
    if (lyrics.status !== "available") return -1;
    let active = -1;
    lyrics.lines.forEach((line, index) => { if (line.time !== null && line.time <= position) active = index; });
    return active;
  }, [lyrics, position]);

  useEffect(() => {
    let alive = true;
    if (!track) { setLyrics({ status: "not_found" }); return () => { alive = false; }; }
    setLyrics({ status: "loading" });
    getLyrics(track).then((result) => { if (alive) setLyrics(result); });
    return () => { alive = false; };
  }, [track?.id]);

  useEffect(() => {
    if (activeIndex >= 0) {
      const lineTop = lineOffsets.current[activeIndex];
      if (lineTop !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, lineTop - 150), animated: true });
    }
  }, [activeIndex]);

  const retry = () => { if (track) { setLyrics({ status: "loading" }); getLyrics(track).then(setLyrics); } };
  const openAttribution = () => {
    if (lyrics.status === "available" && lyrics.attribution?.url) void Linking.openURL(lyrics.attribution.url);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Go back"><Ionicons name="chevron-down" size={23} color={colors.text} /></Pressable>
        <View style={styles.topTitle}><Text style={styles.eyebrow}>LUMAMUSIC</Text><Text style={styles.heading}>Lyrics</Text></View>
        <View style={styles.iconButton}><Ionicons name="text" size={20} color={colors.muted} /></View>
      </View>

      {track ? <View style={styles.trackCard}>
        <Artwork uri={track.artwork} size={54} radius={12} />
        <View style={styles.trackCopy}><Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.artist}>{track.artist}</Text></View>
        <View style={styles.livePill}><View style={[styles.liveDot, { opacity: isPlaying ? 1 : 0.45 }]} /><Text style={styles.liveText}>{isSynced ? (isPlaying ? "SYNCED" : "PAUSED") : "PLAIN"}</Text></View>
      </View> : null}

      <View style={styles.lyricsSurface}>
        {lyrics.status === "loading" ? <View style={styles.centerState}><ActivityIndicator color={colors.accent} /><Text style={styles.stateTitle}>Finding your lyrics</Text><Text style={styles.stateBody}>Matching this recording with the lyrics catalogue.</Text></View> : null}
        {lyrics.status === "unconfigured" ? <View style={styles.centerState}><View style={styles.stateIcon}><Ionicons name="musical-notes" size={25} color={colors.accent} /></View><Text style={styles.stateTitle}>Lyrics are getting ready</Text><Text style={styles.stateBody}>LumaMusic checks the free LRCLIB catalogue for synced or plain lyrics. Some tracks may not be available yet.</Text></View> : null}
        {lyrics.status === "not_found" ? <View style={styles.centerState}><View style={styles.stateIcon}><Ionicons name="text-outline" size={25} color={colors.muted} /></View><Text style={styles.stateTitle}>Lyrics unavailable</Text><Text style={styles.stateBody}>There are no licensed lyrics available for this track yet.</Text></View> : null}
        {lyrics.status === "restricted" ? <View style={styles.centerState}><View style={styles.stateIcon}><Ionicons name="lock-closed-outline" size={24} color={colors.muted} /></View><Text style={styles.stateTitle}>Not available here</Text><Text style={styles.stateBody}>Lyrics for this recording cannot be displayed in your region.</Text></View> : null}
        {lyrics.status === "error" ? <View style={styles.centerState}><View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={25} color={colors.muted} /></View><Text style={styles.stateTitle}>Couldn't load lyrics</Text><Text style={styles.stateBody}>Check your connection and try again.</Text><Pressable onPress={retry} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}
        {lyrics.status === "available" ? <>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.lyricList} showsVerticalScrollIndicator={false}>
            <View style={styles.topFadeSpace} />
            {lyrics.lines.map((line, index) => <Text key={`${line.time ?? "plain"}-${index}`} onLayout={(event) => { lineOffsets.current[index] = event.nativeEvent.layout.y; }} style={[styles.lyricLine, index === activeIndex ? styles.activeLine : null, activeIndex >= 0 && index < activeIndex ? styles.pastLine : null]}>{line.text}</Text>)}
            <View style={styles.bottomFadeSpace} />
          </ScrollView>
          <View style={styles.providerFooter}>
            <Text style={styles.providerText}>{lyrics.copyright ?? `Lyrics provided by ${lyrics.provider}`}</Text>
            {lyrics.attribution?.text ? <Pressable onPress={openAttribution}><Text style={styles.attribution}>{lyrics.attribution.text}</Text></Pressable> : null}
          </View>
        </> : null}
      </View>
      <View style={styles.bottomBar}><Pressable onPress={() => router.back()} style={styles.backToPlayer}><Ionicons name="chevron-down" size={16} color={colors.text} /><Text style={styles.backText}>Back to player</Text></Pressable><Text style={styles.syncLabel}>{lyrics.status === "available" && lyrics.lines.some((line) => line.time !== null) ? "SYNCED LYRICS" : "LYRICS"}</Text></View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 20 },
  topBar: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.075)" },
  topTitle: { alignItems: "center", gap: 2 },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 2 },
  heading: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  trackCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 18, padding: 12, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.085)" },
  trackCopy: { flex: 1, gap: 4 },
  trackTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  artist: { color: colors.muted, fontSize: 11 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)" },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mint },
  liveText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  lyricsSurface: { flex: 1, overflow: "hidden", borderRadius: 25, backgroundColor: "rgba(255,255,255,0.025)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  stateIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" },
  stateBody: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 9, maxWidth: 280 },
  retryButton: { marginTop: 18, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.09)" },
  retryText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  lyricList: { paddingHorizontal: 24, alignItems: "flex-start" },
  topFadeSpace: { height: 170 },
  bottomFadeSpace: { height: 220 },
  lyricLine: { width: "100%", color: colors.muted, fontSize: 23, lineHeight: 32, fontWeight: "700", letterSpacing: -0.55, marginBottom: 27 },
  activeLine: { color: colors.text, fontSize: 27, lineHeight: 36, textShadowColor: colors.accent, textShadowRadius: 10 },
  pastLine: { color: colors.subtle },
  providerFooter: { paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.055)" },
  providerText: { color: colors.subtle, fontSize: 9, textAlign: "center" },
  attribution: { color: colors.accent, fontSize: 10, textAlign: "center", marginTop: 5, fontWeight: "600" },
  bottomBar: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backToPlayer: { flexDirection: "row", alignItems: "center", gap: 5 },
  backText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  syncLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.6 }
}); }
