import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { ThemePalette } from "../theme/colors";
import type { SurfaceStyle } from "../store/preferences";
import { useTheme } from "../theme/useTheme";
import { usePlayerStore } from "../store/player";
import { useLibraryStore } from "../store/library";
import { useAudioEngine } from "../providers/AudioPlayerProvider";
import { usePreferencesStore } from "../store/preferences";
import { useNowPlayingArtworkMotion } from "../hooks/useNowPlayingArtworkMotion";
import { useNowPlayingSeeking } from "../hooks/useNowPlayingSeeking";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return Math.floor(safeSeconds / 60) + ":" + String(safeSeconds % 60).padStart(2, "0");
}

export default function NowPlayingScreen() {
  const { colors, blurTint, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const artworkSize = Math.max(180, Math.min(windowWidth - 44, windowHeight * 0.34, 360));
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const streamQuality = usePlayerStore((s) => s.streamQuality);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const queue = usePlayerStore((s) => s.queue);
  const progressBarStyle = usePreferencesStore((s) => s.progressBarStyle);
  const playerStyle = usePreferencesStore((s) => s.playerStyle);
  const surfaceStyle = usePreferencesStore((s) => s.surfaceStyle);
  const styles = createStyles(colors, isDark, surfaceStyle, artworkSize);
  const motionStyle = usePreferencesStore((s) => s.motionStyle);
  const animationIntensity = usePreferencesStore((s) => s.animationIntensity);
  const { artworkScale, artworkFloat } = useNowPlayingArtworkMotion(isPlaying, motionStyle, animationIntensity);
  const accentColor = colors.accent;
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { togglePlayback, playNext, playPrevious, toggleShuffle, cycleRepeat, seekTo, setPlaybackRate, setSleepTimer } = useAudioEngine();
  const duration = playbackDuration || (track?.durationMs ?? 0) / 1000;
  const isLocalPlayback = track?.source === "local";
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [previousArtwork, setPreviousArtwork] = useState<string | null>(null);
  const artworkCrossfade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setArtworkFailed(false);
    if (!track?.artwork) return;
    setPreviousArtwork((current) => current && current !== track.artwork ? current : null);
    artworkCrossfade.stopAnimation();
    artworkCrossfade.setValue(0);
    Animated.timing(artworkCrossfade, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPreviousArtwork(null);
    });
  }, [track?.id, track?.artwork, artworkCrossfade]);
  const { progressRef, progressPanResponder, onProgressLayout } = useNowPlayingSeeking(duration, seekTo);

  if (!track) {
    return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Choose a track to start listening.</Text></SafeAreaView>;
  }

  const liked = likedTracks.some((item) => item.id === track.id);
  const progress = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const index = speeds.indexOf(playbackRate);
    setPlaybackRate(speeds[(index + 1) % speeds.length]);
  };
  const chooseSleepTimer = () => {
    Alert.alert("Sleep timer", "Pause playback after", [
    { text: "15 minutes", onPress: () => setSleepTimer(15) },
    { text: "30 minutes", onPress: () => setSleepTimer(30) },
    { text: "45 minutes", onPress: () => setSleepTimer(45) },
    { text: "1 hour", onPress: () => setSleepTimer(60) },
    { text: "End of this track", onPress: () => setSleepTimer(-1) },
    ...(sleepTimerMinutes !== null ? [{ text: "Cancel timer", style: "destructive" as const, onPress: () => set  const { progressRef, progressPanResponder, onProgressLayout } = useNowPlayingSeeking(duration, seekTo);={require("../assets/lumamusic-icon.png")} style={styles.brandLogo} /><Text style={styles.brandName}>LumaMusic</Text></View>
        </View>
        <Pressable onPress={chooseSleepTimer} style={styles.headerButton}><Ionicons name="moon-outline" size={22} color={sleepTimerMinutes !== null ? colors.accent : colors.text} /></Pressable>
      </View>
      <View style={styles.main}>
        <Animated.View style={[styles.artFrame, { borderRadius: playerStyle === "vinyl" ? 999 : playerStyle === "poster" ? 16 : 28, transform: [{ translateY: artworkFloat }, { scale: artworkScale }] }]}>
          {previousArtwork ? <Image source={{ uri: previousArtwork }} style={[styles.artwork, StyleSheet.absoluteFill]} /> : null}
          {track.artwork && !artworkFailed ? <Animated.Image source={{ uri: track.artwork }} style={[styles.artwork, { opacity: artworkCrossfade }]} onError={() => setArtworkFailed(true)} /> : <View style={styles.artworkFallback}><Ionicons name="musical-notes" size={56} color={colors.accent} /></View>}
        </Animated.View>
        <View style={styles.trackInfo}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
            {streamQuality && streamQuality.label !== "Unknown" ? <View style={styles.qualityBadge}><Text style={styles.qualityText}>{streamQuality.label}{streamQuality.bitrateKbps ? ` · ${streamQuality.bitrateKbps} kbps` : ""}</Text></View> : null}
          </View>
          <Pressable style={styles.like} onPress={() => toggleLike(track)}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={colors.accent} />
          </Pressable>
        </View>
        <View style={styles.progressArea}>
            <View ref={progressRef} style={[
              styles.progressTrack,
              progressBarStyle === "classic" && styles.progressTrackClassic,
              progressBarStyle === "waveform" && styles.progressTrackWaveform
            ]} onLayout={onProgressLayout} {...progressPanResponder.panHandlers}>
              {progressBarStyle === "waveform" ? (
                <View style={styles.waveformBars}>
                  {Array.from({ length: 42 }, (_, index) => {
                    const height = 7 + Math.round(Math.abs(Math.sin(index * 1.17) * Math.cos(index * 0.39)) * 19);
                    return <View key={index} style={[styles.waveformBar, { height, backgroundColor: index / 42 <= progress / 100 ? accentColor : colors.subtle }]} />;
                  })}
                  <View style={[styles.waveformThumb, { left: `${progress}%`, backgroundColor: accentColor }]} />
                </View>
              ) : (
                <>
                  <View style={[styles.progressFill, progressBarStyle === "classic" && styles.progressFillClassic, { width: `${progress}%`, backgroundColor: accentColor }]} />
                  <View style={[styles.progressThumb, progressBarStyle === "classic" && styles.progressThumbClassic, { left: `${progress}%`, borderColor: accentColor }]} />
                </>
              )}
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatTime(playbackPosition)}</Text>
              <Text style={[styles.time, styles.timeRight]}>{progressBarStyle === "waveform" ? `-${formatTime(Math.max(0, duration - playbackPosition))}` : formatTime(duration)}</Text>
            </View>
        </View>
        {isBuffering ? <Text style={styles.status}>Buffering audio…</Text> : null}
        {playbackError ? <Text style={styles.error}>{playbackError}</Text> : null}
        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle}><Ionicons name="shuffle" size={22} color={isShuffled ? colors.accent : colors.muted} /></Pressable>
          <Pressable onPress={() => { void playPrevious(); }}><Ionicons name="play-skip-back" size={27} color={colors.text} /></Pressable>
          <Pressable style={styles.play} onPress={togglePlayback} accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause playback" : "Start playback"}><View style={styles.playFace}><Ionicons name={isPlaying ? "pause" : "play"} size={27} color={colors.accent} /></View></Pressable>
          <Pressable onPress={() => { void playNext(); }}><Ionicons name="play-skip-forward" size={27} color={colors.text} /></Pressable>
          <Pressable onPress={cycleRepeat}><Ionicons name="repeat" size={22} color={repeatMode === "off" ? colors.muted : colors.accent} /></Pressable>
        </View>
        <View style={styles.extraControls}>
            <Pressable style={styles.extraButton} onPress={cycleSpeed}><Ionicons name="speedometer-outline" size={16} color={colors.accent} /><Text style={styles.extraText}>{playbackRate}× speed</Text></Pressable>
            <Pressable style={styles.extraButton} onPress={chooseSleepTimer}><Ionicons name="moon-outline" size={16} color={colors.accent} /><Text style={styles.extraText}>{sleepTimerMinutes === -1 ? "End of track" : sleepTimerMinutes !== null ? `${sleepTimerMinutes} min timer` : "Sleep timer"}</Text></Pressable>
        </View>
      </View>
      <View style={styles.bottomGlass}><BlurView tint={blurTint} intensity={92} style={StyleSheet.absoluteFill} /><View pointerEvents="none" style={styles.bottomSheen} /><View style={styles.bottom}>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/queue")}>
          <Ionicons name="list" size={20} color={colors.muted} /><Text style={styles.bottomText}>Queue</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => Share.share({ message: track.title + " by " + track.artist + " · " + (track.permalink ?? track.youtubeUrl ?? "LumaMusic") })}>
          <Ionicons name="share-social-outline" size={20} color={colors.muted} /><Text style={styles.bottomText}>Share</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/lyrics")}><Ionicons name="text" size={20} color={colors.muted} /><Text style={styles.bottomText}>Lyrics</Text></Pressable>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/audio-settings")}>
          <Ionicons name="options-outline" size={20} color={colors.muted} /><Text style={styles.bottomText}>Audio</Text>
        </Pressable>
      </View></View>
      <Text style={styles.disclaimer}>{isLocalPlayback ? "LumaMusic · Local audio" : "LumaMusic"}</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette, isDark: boolean, surfaceStyle: SurfaceStyle, artworkSize: number) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 22 },
  ambientBlur: { ...StyleSheet.absoluteFill, opacity: 0.16 },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "relative" },
  headerLeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: isDark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.52)", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.82)" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandLogo: { width: 30, height: 30, borderRadius: 9 },
  brandName: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  headerCopy: { position: "absolute", left: 52, right: 52, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 3 },
  overline: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.7 },
  headerTitle: { color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: "600", includeFontPadding: false, textAlign: "center" },
  main: { flex: 1, minHeight: 0, justifyContent: "space-evenly" },
  artFrame: { width: artworkSize, maxWidth: "100%", alignSelf: "center", flexShrink: 0, aspectRatio: 1, borderRadius: 28, overflow: "hidden", backgroundColor: "#15171B", marginBottom: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.17)", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  artwork: { width: "100%", height: "100%" },
  artworkFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated },
  trackInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  trackTitle: { color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: -0.6 },
  artist: { color: colors.muted, fontSize: 14, marginTop: 5 },
  qualityBadge: { alignSelf: "flex-start", marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  qualityText: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.35 },
  like: { padding: 8 },
  progressArea: { marginTop: 28 },
  externalPlayback: { marginTop: 24, minHeight: 92, alignItems: "center", justifyContent: "center", gap: 10 },
  externalPlaybackHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  externalPlaybackText: { color: colors.muted, fontSize: 10 },
  externalDurationPanel: { alignItems: "center", gap: 3, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.52)", borderWidth: 1, borderColor: colors.border },
  externalDurationLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  externalDuration: { color: colors.text, fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  externalPlaybackHint: { color: colors.subtle, fontSize: 9, textAlign: "center" },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: "#292C38", overflow: "visible", position: "relative" },
  progressTrackClassic: { height: 8, borderRadius: 8 },
  progressTrackWaveform: { height: 34, backgroundColor: "transparent", justifyContent: "center" },
  waveformBars: { width: "100%", height: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "relative" },
  waveformBar: { width: 3, borderRadius: 3 },
  waveformThumb: { position: "absolute", width: 7, height: 7, borderRadius: 4, top: 13, marginLeft: -3.5, borderWidth: 1, borderColor: "#FFFFFF" },
  progressHitArea: { position: "absolute", top: -14, bottom: -14, left: 0, right: 0 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 4 },
  progressFillClassic: { height: 8, borderRadius: 8 },
  progressThumb: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text, top: -4, marginLeft: -6, borderWidth: 2, borderColor: colors.accent },
  progressThumbClassic: { width: 14, height: 14, borderRadius: 7, top: -3, marginLeft: -7 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { color: colors.subtle, fontSize: 12, lineHeight: 16, minWidth: 44, flexShrink: 0, fontVariant: ["tabular-nums"] },
  timeRight: { textAlign: "right", alignSelf: "flex-end" },
  status: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 12 },
  error: { color: colors.danger, fontSize: 10, textAlign: "center", marginTop: 12 },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  play: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.13)" : "rgba(20,20,24,0.12)", alignItems: "center", justifyContent: "center", shadowColor: "#000000", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  playFace: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(20,20,24,0.07)", alignItems: "center", justifyContent: "center" },
  extraControls: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12, flexShrink: 0 },
  extraButton: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 15, backgroundColor: isDark ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.58)", borderWidth: 1, borderColor: colors.border },
  extraText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  bottomGlass: { flexShrink: 0, borderRadius: 23, overflow: "hidden", borderWidth: 1, borderColor: surfaceStyle === "matte" ? colors.border : isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.82)", backgroundColor: surfaceStyle === "matte" ? (isDark ? "#202024" : "#F0F0F2") : surfaceStyle === "clear" ? (isDark ? "rgba(24,24,28,0.18)" : "rgba(255,255,255,0.2)") : surfaceStyle === "frosted" ? (isDark ? "rgba(24,24,28,0.68)" : "rgba(255,255,255,0.68)") : (isDark ? "rgba(24,24,28,0.42)" : "rgba(255,255,255,0.42)"), marginBottom: 6, shadowColor: "#000", shadowOpacity: surfaceStyle === "matte" ? 0.12 : isDark ? 0.22 : 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 8 },
  bottomSheen: { position: "absolute", top: 0, left: 18, right: 18, height: 1, backgroundColor: surfaceStyle === "liquid" ? (isDark ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.95)") : "transparent" },
  bottom: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8 },
  bottomAction: { flexGrow: 1, flexBasis: 0, minWidth: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 5 },
  bottomText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center", includeFontPadding: false, flexShrink: 0, width: "100%" },
  disclaimer: { color: colors.subtle, textAlign: "center", fontSize: 9, paddingBottom: 10 },
  empty: { color: colors.text, textAlign: "center", marginTop: 80 }
}); }
