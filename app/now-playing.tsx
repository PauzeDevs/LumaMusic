import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, PanResponder, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { ThemePalette } from "../theme/colors";
import { useTheme } from "../theme/useTheme";
import { usePlayerStore } from "../store/player";
import { useLibraryStore } from "../store/library";
import { useAudioEngine } from "../providers/AudioPlayerProvider";
import { usePreferencesStore } from "../store/preferences";

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return Math.floor(safe / 60) + ":" + String(safe % 60).padStart(2, "0");
}

export default function NowPlayingScreen() {
  const { colors, blurTint, isDark } = useTheme();
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const playbackPosition = usePlayerStore((s) => s.playbackPosition);
  const playbackDuration = usePlayerStore((s) => s.playbackDuration);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes);
  const isShuffled = usePlayerStore((s) => s.isShuffled);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const progressBarStyle = usePreferencesStore((s) => s.progressBarStyle);
  const motionStyle = usePreferencesStore((s) => s.motionStyle);
  const animationIntensity = usePreferencesStore((s) => s.animationIntensity);
  const styles = createStyles(colors, isDark);
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { togglePlayback, playNext, playPrevious, toggleShuffle, cycleRepeat, seekTo, setPlaybackRate, setSleepTimer } = useAudioEngine();

  const duration = playbackDuration || (track?.durationMs ?? 0) / 1000;
  const isLocalPlayback = track?.source === "local";
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [progressLeft, setProgressLeft] = useState(0);
  const progressRef = useRef<View>(null);
  const entrance = useRef(new Animated.Value(0)).current;
  const artworkOpacity = useRef(new Animated.Value(1)).current;
  const artworkLift = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (motionStyle === "off") {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: motionStyle === "subtle" ? 260 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [entrance, motionStyle]);

  useEffect(() => {
    setArtworkFailed(false);
    if (motionStyle === "off" || animationIntensity <= 0) {
      artworkOpacity.setValue(1);
      artworkLift.setValue(0);
      return;
    }
    artworkOpacity.setValue(0.55);
    artworkLift.setValue(9);
    Animated.parallel([
      Animated.timing(artworkOpacity, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(artworkLift, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, [track?.id, track?.artwork, motionStyle, animationIntensity, artworkOpacity, artworkLift]);

  const progress = duration > 0 ? Math.min(1, Math.max(0, playbackPosition / duration)) : 0;
  useEffect(() => {
    if (motionStyle === "off") {
      progressAnim.setValue(progress);
      return;
    }
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false
    }).start();
  }, [progress, progressAnim, motionStyle]);

  const seekFromScreenX = (screenX: number) => {
    if (progressWidth <= 0 || duration <= 0) return;
    const fraction = Math.max(0, Math.min(1, (screenX - progressLeft) / progressWidth));
    void seekTo(duration * fraction);
  };
  const progressPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_event, gesture) => seekFromScreenX(gesture.x0),
    onPanResponderMove: (_event, gesture) => seekFromScreenX(gesture.moveX)
  }), [progressWidth, progressLeft, duration, seekTo]);

  if (!track) {
    return <SafeAreaView style={styles.safe}><Text style={styles.empty}>Choose a track to start listening.</Text></SafeAreaView>;
  }

  const liked = likedTracks.some((item) => item.id === track.id);
  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const index = speeds.indexOf(playbackRate);
    setPlaybackRate(speeds[(index + 1) % speeds.length]);
  };
  const chooseSleepTimer = () => Alert.alert("Sleep timer", "Pause playback after", [
    { text: "15 minutes", onPress: () => setSleepTimer(15) },
    { text: "30 minutes", onPress: () => setSleepTimer(30) },
    { text: "45 minutes", onPress: () => setSleepTimer(45) },
    { text: "1 hour", onPress: () => setSleepTimer(60) },
    { text: "End of this track", onPress: () => setSleepTimer(-1) },
    ...(sleepTimerMinutes !== null ? [{ text: "Cancel timer", style: "destructive" as const, onPress: () => setSleepTimer(null) }] : []),
    { text: "Close", style: "cancel" as const }
  ]);

  const entranceStyle = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }]
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BlurView tint={blurTint} intensity={isDark ? 22 : 48} style={styles.ambient} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={styles.topButton} accessibilityLabel="Close player">
          <Ionicons name="chevron-down" size={25} color={colors.text} />
        </Pressable>
        <View style={styles.playingFrom}>
          <Text style={styles.eyebrow}>NOW PLAYING</Text>
          <Text numberOfLines={1} style={styles.sourceTitle}>LumaMusic</Text>
        </View>
        <Pressable onPress={chooseSleepTimer} style={styles.topButton} accessibilityLabel="Sleep timer">
          <Ionicons name="moon-outline" size={21} color={sleepTimerMinutes !== null ? colors.accent : colors.text} />
        </Pressable>
      </View>

      <Animated.View style={[styles.content, entranceStyle]}>
        <Animated.View style={[styles.artworkShell, { opacity: artworkOpacity, transform: [{ translateY: artworkLift }] }]}>
          {track.artwork && !artworkFailed
            ? <Image source={{ uri: track.artwork }} style={styles.artwork} resizeMode="cover" onError={() => setArtworkFailed(true)} />
            : <View style={styles.artworkFallback}><Ionicons name="musical-notes" size={76} color={colors.accent} /></View>}
        </Animated.View>

        <View style={styles.trackInfo}>
          <View style={styles.trackCopy}>
            <Text numberOfLines={2} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
          </View>
          <Pressable onPress={() => toggleLike(track)} hitSlop={12} style={styles.likeButton} accessibilityLabel={liked ? "Unlike track" : "Like track"}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={27} color={liked ? colors.accent : colors.muted} />
          </Pressable>
        </View>

        <View style={styles.timeline}>
          <View ref={progressRef} onLayout={(event) => {
            setProgressWidth(event.nativeEvent.layout.width);
            progressRef.current?.measureInWindow((x) => setProgressLeft(x));
          }} style={styles.progressTouch} {...progressPanResponder.panHandlers}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
              <Animated.View style={[styles.progressThumb, { left: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
            </View>
          </View>
          <View style={styles.timeLabels}>
            <Text style={styles.time}>{formatTime(playbackPosition)}</Text>
            <Text style={styles.time}>{formatTime(duration)}</Text>
          </View>
        </View>

        {isBuffering ? <Text style={styles.status}>Loading audio…</Text> : null}
        {playbackError ? <Text style={styles.error}>{playbackError}</Text> : null}

        <View style={styles.transport}>
          <Pressable onPress={toggleShuffle} style={styles.sideControl} accessibilityLabel="Shuffle">
            <Ionicons name="shuffle" size={23} color={isShuffled ? colors.accent : colors.muted} />
          </Pressable>
          <Pressable onPress={() => { void playPrevious(); }} style={styles.skipControl} accessibilityLabel="Previous track">
            <Ionicons name="play-skip-back" size={31} color={colors.text} />
          </Pressable>
          <Pressable onPress={togglePlayback} style={styles.playButton} accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause" : "Play"}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={34} color="#171113" />
          </Pressable>
          <Pressable onPress={() => { void playNext(); }} style={styles.skipControl} accessibilityLabel="Next track">
            <Ionicons name="play-skip-forward" size={31} color={colors.text} />
          </Pressable>
          <Pressable onPress={cycleRepeat} style={styles.sideControl} accessibilityLabel="Repeat">
            <Ionicons name={repeatMode === "one" ? "repeat" : "repeat"} size={22} color={repeatMode === "off" ? colors.muted : colors.accent} />
            {repeatMode === "one" ? <Text style={styles.repeatOne}>1</Text> : null}
          </Pressable>
        </View>

        <View style={styles.utilityRow}>
          <Pressable onPress={cycleSpeed} style={styles.utilityButton}>
            <Ionicons name="speedometer-outline" size={17} color={colors.accent} />
            <Text style={styles.utilityText}>{playbackRate}×</Text>
          </Pressable>
          <Pressable onPress={chooseSleepTimer} style={styles.utilityButton}>
            <Ionicons name="moon-outline" size={17} color={colors.accent} />
            <Text style={styles.utilityText}>{sleepTimerMinutes === -1 ? "End of track" : sleepTimerMinutes !== null ? `${sleepTimerMinutes} min` : "Sleep timer"}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/queue")}>
          <Ionicons name="list" size={22} color={colors.muted} /><Text style={styles.bottomLabel}>Queue</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => Share.share({ message: track.title + " by " + track.artist + " · " + (track.permalink ?? track.youtubeUrl ?? "LumaMusic") })}>
          <Ionicons name="share-outline" size={22} color={colors.muted} /><Text style={styles.bottomLabel}>Share</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/lyrics")}>
          <Ionicons name="text" size={22} color={colors.muted} /><Text style={styles.bottomLabel}>Lyrics</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => router.push("/audio-settings")}>
          <Ionicons name="options-outline" size={22} color={colors.muted} /><Text style={styles.bottomLabel}>Audio</Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>{isLocalPlayback ? "LumaMusic · Local audio" : "LumaMusic"}</Text>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemePalette, isDark: boolean) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent", paddingHorizontal: 22 },
  ambient: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
  topBar: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "rgba(255,255,255,0.075)" : "rgba(0,0,0,0.055)" },
  playingFrom: { flex: 1, alignItems: "center", paddingHorizontal: 14, gap: 2 },
  eyebrow: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.8 },
  sourceTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  content: { flex: 1, justifyContent: "center" },
  artworkShell: { width: "100%", aspectRatio: 1, maxHeight: 390, alignSelf: "center", borderRadius: 8, overflow: "hidden", backgroundColor: colors.surfaceElevated, marginBottom: 31, shadowColor: "#000", shadowOpacity: 0.42, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 14 },
  artwork: { width: "100%", height: "100%" },
  artworkFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  trackInfo: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 62 },
  trackCopy: { flex: 1, gap: 5 },
  trackTitle: { color: colors.text, fontSize: 23, lineHeight: 28, fontWeight: "800", letterSpacing: -0.6 },
  artist: { color: colors.muted, fontSize: 16, fontWeight: "500" },
  likeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  timeline: { marginTop: 28 },
  progressTouch: { height: 28, justifyContent: "center" },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: isDark ? "#34343A" : "#D8D8DE", overflow: "visible" },
  progressFill: { height: 5, borderRadius: 5, backgroundColor: colors.text },
  progressThumb: { position: "absolute", top: -4, width: 13, height: 13, borderRadius: 7, marginLeft: -6.5, backgroundColor: colors.text, borderWidth: 1, borderColor: colors.background },
  timeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  time: { color: colors.subtle, fontSize: 11, fontVariant: ["tabular-nums"] },
  status: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 7 },
  error: { color: colors.danger, fontSize: 10, textAlign: "center", marginTop: 7 },
  transport: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 29 },
  sideControl: { width: 35, height: 48, alignItems: "center", justifyContent: "center", position: "relative" },
  skipControl: { width: 42, height: 52, alignItems: "center", justifyContent: "center" },
  playButton: { width: 82, height: 82, borderRadius: 41, backgroundColor: "#F4F3F5", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  repeatOne: { position: "absolute", top: 12, right: 7, fontSize: 8, color: colors.accent, fontWeight: "900" },
  utilityRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 23 },
  utilityButton: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.075)" : "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: colors.border },
  utilityText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  bottomBar: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  bottomAction: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8 },
  bottomLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  footer: { color: colors.subtle, textAlign: "center", fontSize: 9, paddingBottom: 5 }
}); }
