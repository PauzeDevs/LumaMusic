import { Audio, AudioContext, useAudioTagContext, type AudioTagHandle, type ConvolverNode, type GainNode, type MediaElementAudioSourceNode, type StereoPannerNode } from "react-native-audio-api";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { NativeModules, Platform, View } from "react-native";
import { useLibraryStore } from "../store/library";
import { usePlayerStore } from "../store/player";
import { usePreferencesStore, type ReverbPreset } from "../store/preferences";
import type { MusicTrack } from "../types/music";
import { resolveYouTubeMusicPlayback } from "../services/authorizedPlayback";

type AudioEngineValue = {
  playTrack: (track: MusicTrack, queue?: MusicTrack[], queueIndex?: number) => Promise<void>;
  togglePlayback: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};
const AudioEngineContext = createContext<AudioEngineValue | null>(null);
type ExternalMusicTrack = MusicTrack & { source: "youtube_music"; youtubeVideoId: string };
type LocalMusicTrack = MusicTrack & { source: "local"; localUri: string };
type AudioGraph = { source: MediaElementAudioSourceNode; panner: StereoPannerNode; convolver: ConvolverNode; dry: GainNode; wet: GainNode };
type Media3Status = { isPlaying: boolean; isBuffering: boolean; position: number; duration: number; error: string | null };
type Media3NativeModule = {
  connect: () => Promise<boolean>;
  play: (url: string, title: string, artist: string) => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  seekTo: (seconds: number) => Promise<boolean>;
  setSpeed: (rate: number) => Promise<boolean>;
  getStatus: () => Promise<Media3Status>;
};
const media3Native = NativeModules.LumaMedia3 as Media3NativeModule | undefined;

function isExternalTrack(track: MusicTrack | null | undefined): track is ExternalMusicTrack {
  return Boolean(track?.source === "youtube_music" && typeof track.youtubeVideoId === "string" && track.youtubeVideoId.length > 0);
}
function isLocalTrack(track: MusicTrack | null | undefined): track is LocalMusicTrack {
  return Boolean(track?.source === "local" && typeof track.localUri === "string" && track.localUri.length > 0);
}
function isPlayable(track: MusicTrack | undefined): track is ExternalMusicTrack | LocalMusicTrack {
  return isExternalTrack(track) || isLocalTrack(track);
}
function makeImpulseResponse(context: AudioContext, preset: Exclude<ReverbPreset, "off">) {
  const settings = {
    room: { seconds: 0.42, decay: 3.8, level: 0.65 },
    studio: { seconds: 0.72, decay: 3.1, level: 0.72 },
    hall: { seconds: 1.65, decay: 2.2, level: 0.8 }
  }[preset];
  const length = Math.max(1, Math.floor(context.sampleRate * settings.seconds));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const progress = index / length;
      samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, settings.decay) * (progress < 0.08 ? 1.12 : 1) * settings.level;
    }
  }
  return impulse;
}
function AudioStatusBridge({ onStatus }: { onStatus: (position: number, duration: number, state: string) => void }) {
  const status = useAudioTagContext();
  useEffect(() => onStatus(status.currentTime, status.duration, status.playbackState), [status.currentTime, status.duration, status.playbackState, onStatus]);
  return null;
}

export function AudioPlayerProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [localSource, setLocalSource] = useState<{ uri: string; instance: number } | null>(null);
  const localSourceSequence = useRef(0);
  const media3RemoteActive = useRef(false);
  const audioRef = useRef<AudioTagHandle>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!audioContextRef.current) audioContextRef.current = new AudioContext({ latencyHint: "playback" });

  const setPlaybackStatus = usePlayerStore((state) => state.setPlaybackStatus);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const setPlaybackRateState = usePlayerStore((state) => state.setPlaybackRate);
  const setSleepTimerMinutesState = usePlayerStore((state) => state.setSleepTimerMinutes);
  const toggleShuffleState = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatState = usePlayerStore((state) => state.cycleRepeat);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const spatialBalance = usePreferencesStore((state) => state.spatialBalance);
  const reverbPreset = usePreferencesStore((state) => state.reverbPreset);

  const applyEffects = useCallback((balance: number, preset: ReverbPreset) => {
    const graph = graphRef.current;
    const context = audioContextRef.current;
    if (!graph || !context) return;
    graph.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, balance)), context.currentTime);
    if (preset === "off") {
      graph.convolver.buffer = null;
      graph.wet.gain.setValueAtTime(0, context.currentTime);
      graph.dry.gain.setValueAtTime(1, context.currentTime);
      return;
    }
    graph.convolver.buffer = makeImpulseResponse(context, preset);
    const wetLevel = preset === "room" ? 0.16 : preset === "studio" ? 0.22 : 0.34;
    graph.wet.gain.setValueAtTime(wetLevel, context.currentTime);
    graph.dry.gain.setValueAtTime(1 - wetLevel * 0.35, context.currentTime);
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })
      .catch((error: unknown) => setPlaybackError(error instanceof Error ? error.message : "Could not configure audio playback."));
  }, [setPlaybackError]);

  useEffect(() => {
    if (isLocalTrack(currentTrack) || media3RemoteActive.current) return;
    setPlaybackStatus({
      isPlaying: status.playing, isBuffering: status.isBuffering,
      playbackPosition: status.currentTime, playbackDuration: status.duration,
      playbackError: status.error ?? null
    });
  }, [status.playing, status.isBuffering, status.currentTime, status.duration, status.error, setPlaybackStatus, currentTrack?.id]);

  useEffect(() => applyEffects(spatialBalance, reverbPreset), [spatialBalance, reverbPreset, applyEffects]);

  useEffect(() => {
    if (Platform.OS !== "android" || !media3Native || !media3RemoteActive.current) return;
    const timer = setInterval(() => {
      void media3Native.getStatus().then((nativeStatus) => {
        if (!media3RemoteActive.current) return;
        setPlaybackStatus({
          isPlaying: nativeStatus.isPlaying,
          isBuffering: nativeStatus.isBuffering,
          playbackPosition: nativeStatus.position,
          playbackDuration: nativeStatus.duration,
          playbackError: nativeStatus.error
        });
      }).catch((error: unknown) => {
        setPlaybackError(error instanceof Error ? error.message : "Could not read native playback status.");
      });
    }, 500);
    return () => clearInterval(timer);
  }, [currentTrack?.id, setPlaybackStatus, setPlaybackError]);

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    graphRef.current?.source.disconnect();
    graphRef.current?.panner.disconnect();
    graphRef.current?.convolver.disconnect();
    graphRef.current?.dry.disconnect();
    graphRef.current?.wet.disconnect();
    void audioContextRef.current?.close();
  }, []);

  const onLocalAudioLoad = useCallback(() => {
    const context = audioContextRef.current;
    const element = audioRef.current;
    if (!context || !element || graphRef.current) return;
    try {
      const source = context.createMediaElementSource(element);
      const panner = context.createStereoPanner();
      const convolver = context.createConvolver();
      const dry = context.createGain();
      const wet = context.createGain();
      source.connect(panner);
      panner.connect(dry);
      dry.connect(context.destination);
      panner.connect(convolver);
      convolver.connect(wet);
      wet.connect(context.destination);
      graphRef.current = { source, panner, convolver, dry, wet };
      applyEffects(usePreferencesStore.getState().spatialBalance, usePreferencesStore.getState().reverbPreset);
      void context.resume().then(() => element.play()).catch((error: unknown) => setPlaybackError(error instanceof Error ? error.message : "Could not start this local audio file."));
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Could not connect the audio effects engine.");
    }
  }, [applyEffects, setPlaybackError]);

  const onLocalAudioStatus = useCallback((position: number, duration: number, playbackState: string) => {
    setPlaybackStatus({
      isPlaying: playbackState === "playing" || playbackState === "buffering",
      isBuffering: playbackState === "buffering",
      playbackPosition: Math.max(0, position || 0),
      playbackDuration: Math.max(0, duration || 0),
      playbackError: null
    });
  }, [setPlaybackStatus]);

  const disconnectGraph = useCallback(() => {
    graphRef.current?.source.disconnect();
    graphRef.current?.panner.disconnect();
    graphRef.current?.convolver.disconnect();
    graphRef.current?.dry.disconnect();
    graphRef.current?.wet.disconnect();
    graphRef.current = null;
  }, []);

  const playTrack = useCallback(async (track: MusicTrack, nextQueue?: MusicTrack[], queueIndex?: number) => {
    if (!isExternalTrack(track) && !isLocalTrack(track)) throw new Error("This track has no supported playback source.");
    const queue = nextQueue?.length ? nextQueue : [track];
    if (isLocalTrack(usePlayerStore.getState().currentTrack)) audioRef.current?.pause();
    if (media3RemoteActive.current && media3Native) void media3Native.pause();
    media3RemoteActive.current = false;
    disconnectGraph();
    usePlayerStore.getState().setTrack(track, queue, queueIndex);
    useLibraryStore.getState().addRecentTrack(track);
    if (isExternalTrack(track)) {
      setLocalSource(null);
      player.pause();
      usePlayerStore.getState().setPlaybackStatus({
        isPlaying: false,
        isBuffering: true,
        playbackPosition: 0,
        playbackDuration: Math.max(0, track.durationMs / 1000),
        playbackError: null
      });
      const stream = await resolveYouTubeMusicPlayback(track);
      player.replace({
        uri: stream.url,
        ...(stream.headers ? { headers: stream.headers } : {})
      });
      player.setPlaybackRate(usePlayerStore.getState().playbackRate, "high");
      player.play();
      return;
    }
    if (isLocalTrack(track)) {
      player.pause();
      setLocalSource({ uri: track.localUri, instance: ++localSourceSequence.current });
      usePlayerStore.getState().setPlaybackStatus({ isPlaying: false, isBuffering: true, playbackPosition: 0, playbackDuration: Math.max(0, track.durationMs / 1000), playbackError: null });
      return;
    }
    throw new Error("This track has no supported playback source.");
  }, [disconnectGraph, player]);

  const playTrackSafely = useCallback(async (track: MusicTrack, queue: MusicTrack[], queueIndex?: number) => {
    try { await playTrack(track, queue, queueIndex); }
    catch (error) { setPlaybackError(error instanceof Error ? error.message : "Unable to open this track."); }
  }, [playTrack, setPlaybackError]);

  const togglePlayback = useCallback(() => {
    const state = usePlayerStore.getState();
    if (isExternalTrack(state.currentTrack)) {
      if (state.isPlaying || status.playing) player.pause();
      else player.play();
      return;
    }
    if (isLocalTrack(state.currentTrack)) {
      if (state.isPlaying) audioRef.current?.pause();
      else void audioContextRef.current?.resume().then(() => audioRef.current?.play());
      return;
    }
    if (status.playing) player.pause();
    else if (state.currentTrack) player.play();
  }, [player, setPlaybackError, status.playing]);

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    const currentIndex = state.currentQueueIndex;
    if (state.repeatMode === "one") {
      if (isExternalTrack(state.currentTrack)) { if (media3RemoteActive.current && media3Native) { await media3Native.seekTo(0); await media3Native.resume(); } else { await player.seekTo(0); player.play(); } }
      else if (isLocalTrack(state.currentTrack)) audioRef.current?.seekToTime(0);
      else { await player.seekTo(0); player.play(); }
      return;
    }
    let nextTrack: MusicTrack | undefined;
    let nextQueueIndex = -1;
    if (state.isShuffled) {
      const candidates = state.queue.map((item, index) => ({ item, index })).filter(({ index, item }) => index !== currentIndex && isPlayable(item));
      if (candidates.length > 0) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        nextTrack = selected.item;
        nextQueueIndex = selected.index;
      } else if (state.repeatMode === "all") {
        const firstPlayableIndex = state.queue.findIndex(isPlayable);
        if (firstPlayableIndex >= 0) { nextTrack = state.queue[firstPlayableIndex]; nextQueueIndex = firstPlayableIndex; }
      }
    } else {
      for (let offset = 1; offset <= state.queue.length; offset += 1) {
        let index = currentIndex + offset;
        if (index >= state.queue.length) {
          if (state.repeatMode === "off") break;
          index %= state.queue.length;
        }
        const candidate = state.queue[index];
        if (isPlayable(candidate)) { nextTrack = candidate; nextQueueIndex = index; break; }
      }
    }
    if (nextTrack) await playTrackSafely(nextTrack, state.queue, nextQueueIndex);
    else if (isLocalTrack(state.currentTrack)) audioRef.current?.pause();
    else if (!isExternalTrack(state.currentTrack)) player.pause();
  }, [playTrackSafely, player]);

  const playPrevious = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one" || (!isExternalTrack(state.currentTrack) && state.playbackPosition > 3)) {
      if (isExternalTrack(state.currentTrack)) { if (media3RemoteActive.current && media3Native) await media3Native.seekTo(0); else await player.seekTo(0); }
      else if (isLocalTrack(state.currentTrack)) audioRef.current?.seekToTime(0);
      else await player.seekTo(0);
      return;
    }
    const currentIndex = state.currentQueueIndex;
    for (let offset = 1; offset <= state.queue.length; offset += 1) {
      let index = currentIndex - offset;
      if (index < 0) {
        if (state.repeatMode === "off") break;
        index = (index % state.queue.length + state.queue.length) % state.queue.length;
      }
      const candidate = state.queue[index];
      if (isPlayable(candidate)) { await playTrackSafely(candidate, state.queue, index); return; }
    }
    if (isExternalTrack(state.currentTrack)) await player.seekTo(0);
    else if (isLocalTrack(state.currentTrack)) audioRef.current?.seekToTime(0);
    else await player.seekTo(0);
  }, [playTrackSafely, player]);

  const setPlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.max(0.5, Math.min(2, rate));
    player.setPlaybackRate(safeRate, "high");
    setPlaybackRateState(safeRate);
  }, [player, setPlaybackRateState]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }
    setSleepTimerMinutesState(minutes);
    if (minutes !== null && minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (isLocalTrack(usePlayerStore.getState().currentTrack)) audioRef.current?.pause();
        else player.pause();
        sleepTimerRef.current = null;
        setSleepTimerMinutesState(null);
      }, minutes * 60_000);
    }
  }, [player, setSleepTimerMinutesState]);

  const seekTo = useCallback(async (seconds: number) => {
    const track = usePlayerStore.getState().currentTrack;
    if (isLocalTrack(track)) { audioRef.current?.seekToTime(Math.max(0, seconds)); return; }
    await player.seekTo(Math.max(0, seconds));
  }, [player]);

  const onLocalAudioEnded = useCallback(() => {
    if (usePlayerStore.getState().sleepTimerMinutes === -1) {
      audioRef.current?.pause();
      setSleepTimerMinutesState(null);
      return;
    }
    void playNext();
  }, [playNext, setSleepTimerMinutesState]);

  useEffect(() => {
    if (!status.didJustFinish || isLocalTrack(currentTrack)) return;
    if (usePlayerStore.getState().sleepTimerMinutes === -1) { player.pause(); setSleepTimerMinutesState(null); return; }
    void playNext();
  }, [status.didJustFinish, currentTrack?.id, playNext, player, setSleepTimerMinutesState]);

  const value: AudioEngineValue = {
    playTrack, togglePlayback, playNext, playPrevious, seekTo, setPlaybackRate, setSleepTimer,
    toggleShuffle: toggleShuffleState, cycleRepeat: cycleRepeatState
  };

  return (
    <AudioEngineContext.Provider value={value}>
      {children}
      {localSource ? (
        <View pointerEvents="none" style={{ width: 0, height: 0, opacity: 0, overflow: "hidden" }}>
          <Audio
            key={localSource.instance}
            ref={audioRef}
            source={localSource.uri}
            context={audioContextRef.current ?? undefined}
            controls={false}
            playbackRate={playbackRate}
            onLoad={onLocalAudioLoad}
            onError={(error) => setPlaybackError(error.message)}
            onEnded={onLocalAudioEnded}
          >
            <AudioStatusBridge onStatus={onLocalAudioStatus} />
          </Audio>
        </View>
      ) : null}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngine() {
  const context = useContext(AudioEngineContext);
  if (!context) throw new Error("useAudioEngine must be used inside AudioPlayerProvider.");
  return context;
}
