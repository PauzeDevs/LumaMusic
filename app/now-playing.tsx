import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, PanResponder, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { colors } from "../theme/colors";
import { usePlayerStore } from "../store/player";
import { useLibraryStore } from "../store/library";
import { useAudioEngine } from "../providers/AudioPlayerProvider";
import { usePreferencesStore } from "../store/preferences";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return Math.floor(safeSeconds / 60) + ":" + String(safeSeconds % 60).padStart(2, "0");
}

export default function NowPlayingScreen() {
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
  const queue = usePlayerStore((s) => s.queue);
  const progressBarStyle = usePreferencesStore((s) => s.progressBarStyle);
  const likedTracks = useLibraryStore((s) => s.likedTracks);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { togglePlayback, playNext, playPrevious, toggleShuffle, cycleRepeat, seekTo, setPlaybackRate, setSleepTimer } = useAudioEngine();
  const duration = playbackDuration || (track?.durationMs ?? 0) / 1000;
  const isExternalPlayback = track?.source === "youtube_music";
  const isLocalPlayback = track?.source === "local";
  const [artworkFailed, setArtworkFailed] = useState(false);
  useEffect(() => setArtworkFailed(false), [track?.id, track?.artwork]);
  const [progressWidth, setProgressWidth] = useState(0);
  const [progressLeft, setProgressLeft] = useState(0);
  const progressRef = useRef<View>(null);
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
  const progress = duration > 0 ? Math.min(100, (playbackPosition / duration) * 100) : 0;
  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const index = speeds.indexOf(playbackRate);
    setPlaybackRate(speeds[(index + 1) % speeds.length]);
  };
  const chooseSleepTimer = () => {
    if (isExternalPlayback) {
      Alert.alert("Sleep timer unavailable", "Playback is handled by the external player. Use its playback controls or your device settings for a sleep timer.");
      return;
    }
    Alert.alert("Sleep timer", "Pause playback after", [
    { text: "15 minutes", onPress: () => setSleepTimer(15) },
    { text: "30 minutes", onPress: () => setSleepTimer(30) },
    { text: "45 minutes", onPress: () => setSleepTimer(45) },
    { text: "1 hour", onPress: () => setSleepTimer(60) },
    { text: "End of this track", onPress: () => setSleepTimer(-1) },
    ...(sleepTimerMinutes !== null ? [{ text: "Cancel timer", style: "destructive" as const, onPress: () => setSleepTimer(null) }] : []),
    { text: "Close", style: "cancel" as const }
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <BlurView tint="dark" intensity={32} style={styles.ambientBlur} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-down" size={24} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.overline}>{isExternalPlayback ? "OPENED IN" : "NOW PLAYING"}</Text><Text style={styles.headerTitle}>{isExternalPlayback ? "External player" : isLocalPlayback ? "Local audio" : "Your library"}</Text></View>
        <Pressable onPress={chooseSleepTimer} style={styles.headerButton}><Ionicons name="moon-outline" size={22} color={sleepTimerMinutes !== null ? colors.accent : colors.text} /></Pressable>
      </View>
      <View style={styles.main}>
        <View style={styles.artFrame}>
          {track.artwork && !artworkFailed ? <Image source={{ uri: track.artwork }} style={styles.artwork} onError={() => setArtworkFailed(true)} /> : <View style={styles.artworkFallback}><Ionicons name="musical-notes" size={56} color={colors.accent} /></View>}
        </View>
        <View style={styles.trackInfo}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
          </View>
          <Pressable style={styles.like} onPress={() => toggleLike(track)}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={colors.accent} />
          </Pressable>
        </View>
        {isExternalPlayback ? (
          <View style={styles.externalPlayback}>
            <View style={styles.externalPlaybackHeader}>
              <Ionicons name="open-outline" size={15} color={colors.accent} />
              <Text style={styles.externalPlaybackText}>Playback is controlled externally</Text>
            </View>
            <View style={styles.externalDurationPanel}>
              <Text style={styles.externalDurationLabel}>TRACK LENGTH</Text>
              <Text style={styles.externalDuration}>{duration > 0 ? formatTime(duration) : "Unavailable"}</Text>
            </View>
            <Text style={styles.externalPlaybackHint}>Live progress is available when audio plays inside LumaMusic.</Text>
          </View>
        ) : (
          <View style={styles.progressArea}>
            <View ref={progressRef} style={[styles.progressTrack, progressBarStyle === "classic" && styles.progressTrackClassic]} onLayout={(event) => { setProgressWidth(event.nativeEvent.layout.width); progressRef.current?.measureInWindow((x) => setProgressLeft(x)); }} {...progressPanResponder.panHandlers}>
              <View style={[styles.progressFill, progressBarStyle === "classic" && styles.progressFillClassic, { width: `${progress}%` }]} />
              <View style={[styles.progressThumb, progressBarStyle === "classic" && styles.progressThumbClassic, { left: `${progress}%` }]} />
            </View>
            <View style={styles.timeRow}><Text style={styles.time}>{formatTime(playbackPosition)}</Text><Text style={styles.time}>{formatTime(duration)}</Text></View>
          </View>
        )}
        {isBuffering ? <Text style={styles.status}>Buffering audio…</Text> : null}
        {playbackError ? <Text style={styles.error}>{playbackError}</Text> : null}
        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle}><Ionicons name="shuffle" size={22} color={isShuffled ? colors.accent : colors.muted} /></Pressable>
          <Pressable onPress={() => { void playPrevious(); }}><Ionicons name="play-skip-back" size={27} color={colors.text} /></Pressable>
          <Pressable style={styles.play} onPress={togglePlayback} accessibilityRole="button" accessibilityLabel="Open track in external player"><Ionicons name={isExternalPlayback ? "open-outline" : isPlaying ? "pause" : "play"} size={29} color="#17111F" /></Pressable>
          <Pressable onPress={() => { void playNext(); }}><Ionicons name="play-skip-forward" size={27} color={colors.text} /></Pressable>
          <Pressable onPress={cycleRepeat}><Ionicons name="repeat" size={22} color={repeatMode === "off" ? colors.muted : colors.accent} /></Pressable>
        </View>
        {!isExternalPlayback ? (
          <View style={styles.extraControls}>
            <Pressable style={styles.extraButton} onPress={cycleSpeed}><Ionicons name="speedometer-outline" size={16} color={colors.accent} /><Text style={styles.extraText}>{playbackRate}× speed</Text></Pressable>
            <Pressable style={styles.extraButton} onPress={chooseSleepTimer}><Ionicons name="moon-outline" size={16} color={colors.accent} /><Text style={styles.extraText}>{sleepTimerMinutes === -1 ? "End of track" : sleepTimerMinutes !== null ? `${sleepTimerMinutes} min timer` : "Sleep timer"}</Text></Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.bottomGlass}><BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} /><View style={styles.bottom}>
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
      <Text style={styles.disclaimer}>{isExternalPlayback ? "LumaMusic · External playback" : isLocalPlayback ? "LumaMusic · Native audio engine" : "LumaMusic"}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 22 },
  ambientBlur: { ...StyleSheet.absoluteFill, opacity: 0.16 },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: "rgba(255,255,255,0.065)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerCopy: { alignItems: "center", gap: 3 },
  overline: { color: colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 1.7 },
  headerTitle: { color: colors.muted, fontSize: 11 },
  main: { flex: 1, justifyContent: "center" },
  artFrame: { width: "100%", aspectRatio: 1, borderRadius: 28, overflow: "hidden", backgroundColor: "#15171B", marginBottom: 30, borderWidth: 1, borderColor: "rgba(255,255,255,0.17)", shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  artwork: { width: "100%", height: "100%" },
  artworkFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated },
  trackInfo: { flexDirection: "row", alignItems: "center", gap: 16 },
  trackTitle: { color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: -0.6 },
  artist: { color: colors.muted, fontSize: 14, marginTop: 5 },
  like: { padding: 8 },
  progressArea: { marginTop: 28 },
  externalPlayback: { marginTop: 24, minHeight: 92, alignItems: "center", justifyContent: "center", gap: 10 },
  externalPlaybackHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  externalPlaybackText: { color: colors.muted, fontSize: 10 },
  externalDurationPanel: { alignItems: "center", gap: 3, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  externalDurationLabel: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  externalDuration: { color: colors.text, fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  externalPlaybackHint: { color: colors.subtle, fontSize: 9, textAlign: "center" },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: "#292C38", overflow: "visible", position: "relative" },
  progressTrackClassic: { height: 8, borderRadius: 8 },
  progressHitArea: { position: "absolute", top: -14, bottom: -14, left: 0, right: 0 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 4 },
  progressFillClassic: { height: 8, borderRadius: 8 },
  progressThumb: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text, top: -4, marginLeft: -6, borderWidth: 2, borderColor: colors.accent },
  progressThumbClassic: { width: 14, height: 14, borderRadius: 7, top: -3, marginLeft: -7 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { color: colors.subtle, fontSize: 10, fontVariant: ["tabular-nums"] },
  status: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 12 },
  error: { color: colors.danger, fontSize: 10, textAlign: "center", marginTop: 12 },
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  play: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#F0F2F5", alignItems: "center", justifyContent: "center" },
  extraControls: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 18 },
  extraButton: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  extraText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  bottomGlass: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", backgroundColor: "rgba(20,22,27,0.65)", marginBottom: 6 },
  bottom: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 16, paddingHorizontal: 8, flexWrap: "wrap" },
  bottomAction: { flexDirection: "row", alignItems: "center", gap: 7 },
  bottomText: { color: colors.muted, fontSize: 11 },
  disclaimer: { color: colors.subtle, textAlign: "center", fontSize: 9, paddingBottom: 10 },
  empty: { color: colors.text, textAlign: "center", marginTop: 80 }
});
