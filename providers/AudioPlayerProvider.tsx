import { Audio, AudioContext, PlaybackNotificationManager, useAudioTagContext, type AudioTagHandle, type ConvolverNode, type GainNode, type MediaElementAudioSourceNode, type StereoPannerNode } from "react-native-audio-api";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { View } from "react-native";
import { resolveYouTubeMusicAudio } from "../services/youtubePlayback";
import { getYouTubeMusicUpNextTracks } from "../services/youtubeMusic";
import { useLibraryStore } from "../store/library";
import { useListeningStatsStore } from "../store/listeningStats";
import { usePlayerStore } from "../store/player";
import { usePreferencesStore, type ReverbPreset } from "../store/preferences";
import type { MusicTrack } from "../types/music";

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
type ExternalMusicTrack = MusicTrack & { source: "youtube_music" };
type LocalMusicTrack = MusicTrack & { source: "local"; localUri: string };
type AudioGraph = { source: MediaElementAudioSourceNode; panner: StereoPannerNode; convolver: ConvolverNode; dry: GainNode; wet: GainNode; filters: ReturnType<AudioContext["createBiquadFilter"]>[] };

function isExternalTrack(track: MusicTrack | null | undefined): track is ExternalMusicTrack {
  return Boolean(
    track?.source === "youtube_music" &&
      ((typeof track.youtubeVideoId === "string" && track.youtubeVideoId.length > 0) ||
        (typeof track.sourceTrackId === "string" && track.sourceTrackId.length > 0) ||
        (typeof track.youtubeUrl === "string" && track.youtubeUrl.length > 0))
  );
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
  const [localSource, setLocalSource] = useState<{ uri: string; instance: number; headers?: Record<string, string> } | null>(null);
  const localSourceSequence = useRef(0);
  const playbackRequestSequence = useRef(0);
  const handledFinishedState = useRef(false);
  const fetchingAutoplayQueue = useRef(false);
  const automaticRecovery = useRef<{ trackId: string | null; attempts: number }>({ trackId: null, attempts: 0 });
  const audioRef = useRef<AudioTagHandle>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!audioContextRef.current) audioContextRef.current = new AudioContext({ latencyHint: "playback" });

  const setPlaybackStatus = usePlayerStore((state) => state.setPlaybackStatus);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const setPlaybackRateState = usePlayerStore((state) => state.setPlaybackRate);
  const setSleepTimerMinutesState = usePlayerStore((state) => state.setSleepTimerMinutes);
  const toggleShuffleState = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatState = usePlayerStore((state) => state.cycleRepeat);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const storeIsBuffering = usePlayerStore((state) => state.isBuffering);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const spatialBalance = usePreferencesStore((state) => state.spatialBalance);
  const reverbPreset = usePreferencesStore((state) => state.reverbPreset);
  const equalizerEnabled = usePreferencesStore((state) => state.equalizerEnabled);
  const equalizerBands = usePreferencesStore((state) => state.equalizerBands);

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
    if (isLocalTrack(currentTrack) || isExternalTrack(currentTrack)) return;
    setPlaybackStatus({
      isPlaying: status.playing, isBuffering: status.isBuffering,
      playbackPosition: status.currentTime, playbackDuration: status.duration,
      playbackError: status.error ?? null
    });
    if (currentTrack) useListeningStatsStore.getState().recordProgress(currentTrack, status.currentTime, status.playing);
  }, [status.playing, status.isBuffering, status.currentTime, status.duration, status.error, setPlaybackStatus, currentTrack?.id]);

  const applyEqualizer = useCallback((enabled: boolean, bands: number[]) => {
    const graph = graphRef.current;
    const context = audioContextRef.current;
    if (!graph || !context) return;
    graph.filters.forEach((filter, index) => {
      filter.gain.setValueAtTime(enabled ? (bands[index] ?? 0) : 0, context.currentTime);
    });
  }, []);

  useEffect(() => applyEffects(spatialBalance, reverbPreset), [spatialBalance, reverbPreset, applyEffects]);
  useEffect(() => applyEqualizer(equalizerEnabled, equalizerBands), [equalizerEnabled, equalizerBands, applyEqualizer]);

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
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
      const frequencies = [60, 250, 1000, 4000, 12000];
      const filters = frequencies.map((frequency, index) => {
        const filter = context.createBiquadFilter();
        filter.type = index === 0 ? "lowshelf" : index === frequencies.length - 1 ? "highshelf" : "peaking";
        filter.frequency.setValueAtTime(frequency, context.currentTime);
        filter.Q.setValueAtTime(1, context.currentTime);
        filter.gain.setValueAtTime(0, context.currentTime);
        return filter;
      });
      let previous: MediaElementAudioSourceNode | ReturnType<AudioContext["createBiquadFilter"]> = source;
      filters.forEach((filter) => { previous.connect(filter); previous = filter; });
      previous.connect(panner);
      panner.connect(dry);
      dry.connect(context.destination);
      panner.connect(convolver);
      convolver.connect(wet);
      wet.connect(context.destination);
      graphRef.current = { source, panner, convolver, dry, wet, filters };
      applyEffects(usePreferencesStore.getState().spatialBalance, usePreferencesStore.getState().reverbPreset);
      applyEqualizer(usePreferencesStore.getState().equalizerEnabled, usePreferencesStore.getState().equalizerBands);
      void context.resume().then(() => element.play()).catch((error: unknown) => setPlaybackError(error instanceof Error ? error.message : "Could not start this local audio file."));
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Could not connect the audio effects engine.");
    }
  }, [applyEffects, applyEqualizer, setPlaybackError]);

  const onLocalAudioStatus = useCallback((position: number, duration: number, playbackState: string) => {
    const active = playbackState === "playing";
    if (active && startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
    const previousError = usePlayerStore.getState().playbackError;
    setPlaybackStatus({
      isPlaying: active,
      isBuffering: playbackState === "buffering",
      playbackPosition: Math.max(0, Number.isFinite(position) ? position : 0),
      playbackDuration: Math.max(0, Number.isFinite(duration) ? duration : 0),
      // A paused/metadata status event must not erase a real playback failure.
      playbackError: active ? null : previousError
    });
    const track = usePlayerStore.getState().currentTrack;
    if (track) useListeningStatsStore.getState().recordProgress(track, position, active);
    if (track) {
      void PlaybackNotificationManager.show({
        state: active ? "playing" : "paused",
        elapsedTime: Math.max(0, position || 0),
        duration: Math.max(0, duration || 0)
      }).catch(() => undefined);
    }
  }, [setPlaybackStatus]);

  const disconnectGraph = useCallback(() => {
    graphRef.current?.source.disconnect();
    graphRef.current?.panner.disconnect();
    graphRef.current?.convolver.disconnect();
    graphRef.current?.dry.disconnect();
    graphRef.current?.wet.disconnect();
    graphRef.current?.filters.forEach((filter) => filter.disconnect());
    graphRef.current = null;
  }, []);

  const playTrack = useCallback(async (track: MusicTrack, nextQueue?: MusicTrack[], queueIndex?: number) => {
    if (!isExternalTrack(track) && !isLocalTrack(track)) throw new Error("This track has no supported playback source.");
    const requestId = ++playbackRequestSequence.current;
    if (startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
    const queue = nextQueue?.length ? nextQueue : [track];
    if (isLocalTrack(usePlayerStore.getState().currentTrack) || isExternalTrack(usePlayerStore.getState().currentTrack)) audioRef.current?.pause();
    // Stop the previous stream immediately; don't let it play underneath a new selection.
    player.pause();
    disconnectGraph();
    usePlayerStore.getState().setTrack(track, queue, queueIndex);
    useLibraryStore.getState().addRecentTrack(track);
    useListeningStatsStore.getState().beginTrack();

    if (isExternalTrack(track)) {
      setLocalSource(null);
      usePlayerStore.getState().setPlaybackStatus({ isPlaying: false, isBuffering: true, playbackPosition: 0, playbackDuration: Math.max(0, track.durationMs / 1000), playbackError: null });
      try {
        const stream = await resolveYouTubeMusicAudio(track);
        // A slower, older resolver must never replace the song the user selected most recently.
        if (requestId !== playbackRequestSequence.current) return;
        // Feed the resolved YouTube URL into the native Audio API element so its
        // samples pass through the same AudioContext graph as imported local audio.
        setLocalSource({
          uri: stream.url,
          headers: {
            "User-Agent": stream.userAgent,
            Origin: "https://www.youtube.com",
            Referer: "https://www.youtube.com/"
          },
          instance: ++localSourceSequence.current
        });
        // Do not leave the UI spinning forever if the resolved stream never starts.
        startupTimeoutRef.current = setTimeout(() => {
          startupTimeoutRef.current = null;
          const latest = usePlayerStore.getState();
          if (requestId !== playbackRequestSequence.current || latest.currentTrack?.id !== track.id || !latest.isBuffering) return;
          audioRef.current?.pause();
          latest.setPlaybackError("Audio stream did not start within 20 seconds. The stream may be unavailable or blocked. Tap Play to retry.");
        }, 20_000);
        // Warm the next playlist stream while this song is already playing.
        // Selecting it later can then reuse the in-memory URL cache.
        const nextTrack = queue.slice(Math.max(0, (queueIndex ?? queue.findIndex((item) => item.id === track.id)) + 1))
          .find((item) => isExternalTrack(item));
        if (nextTrack) {
          void resolveYouTubeMusicAudio(nextTrack).catch(() => undefined);
        }
        // Keep the loading state until the native Audio API reports playback/buffering status.
        usePlayerStore.getState().setPlaybackStatus({ isPlaying: false, isBuffering: true, playbackPosition: 0, playbackDuration: stream.durationSeconds, playbackError: null });
        return;
      } catch (error) {
        if (startupTimeoutRef.current) {
          clearTimeout(startupTimeoutRef.current);
          startupTimeoutRef.current = null;
        }
        if (requestId !== playbackRequestSequence.current) return;
        const errorMessage = error instanceof Error ? error.message : "Could not stream this track.";
        usePlayerStore.getState().setPlaybackStatus({ isPlaying: false, isBuffering: false, playbackPosition: 0, playbackDuration: Math.max(0, track.durationMs / 1000), playbackError: errorMessage });
        setPlaybackError(errorMessage);
        throw error;
      }
    }

    if (isLocalTrack(track)) {
      player.pause();
      setLocalSource({ uri: track.localUri, instance: ++localSourceSequence.current });
      usePlayerStore.getState().setPlaybackStatus({ isPlaying: false, isBuffering: true, playbackPosition: 0, playbackDuration: Math.max(0, track.durationMs / 1000), playbackError: null });
      return;
    }

    throw new Error("This track has no supported playback source.");
  }, [disconnectGraph, player, setPlaybackError]);

  const playTrackSafely = useCallback(async (track: MusicTrack, queue: MusicTrack[], queueIndex?: number) => {
    try { await playTrack(track, queue, queueIndex); }
    catch (error) { setPlaybackError(error instanceof Error ? error.message : "Unable to open this track."); }
  }, [playTrack, setPlaybackError]);

  useEffect(() => {
    const track = currentTrack;
    if (automaticRecovery.current.trackId !== (track?.id ?? null)) {
      automaticRecovery.current = { trackId: track?.id ?? null, attempts: 0 };
    }
    if (!status.error || !isExternalTrack(track) || status.isBuffering || storeIsBuffering) return;
    if (automaticRecovery.current.attempts >= 1) return;

    // Retry one failed external stream automatically. The bounded attempt count
    // prevents a persistent 403/network failure from creating an infinite loop.
    automaticRecovery.current.attempts += 1;
    void playTrackSafely(track, usePlayerStore.getState().queue, usePlayerStore.getState().currentQueueIndex);
  }, [status.error, status.isBuffering, storeIsBuffering, currentTrack?.id, playTrackSafely]);

  const togglePlayback = useCallback(() => {
    const state = usePlayerStore.getState();
    if (isExternalTrack(state.currentTrack)) {
      if (state.isPlaying) {
        audioRef.current?.pause();
      } else if (state.playbackError || !audioRef.current) {
        // Expired streams are resolved again instead of trying to resume a dead URL.
        void playTrackSafely(state.currentTrack, state.queue, state.currentQueueIndex);
      } else {
        void audioContextRef.current?.resume().then(() => audioRef.current?.play());
      }
      return;
    }
    if (isLocalTrack(state.currentTrack) || isExternalTrack(state.currentTrack)) {
      if (state.isPlaying) audioRef.current?.pause();
      else void audioContextRef.current?.resume().then(() => audioRef.current?.play());
      return;
    }
    if (status.playing) player.pause();
    else if (state.currentTrack) player.play();
  }, [player, playTrackSafely]);

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    const currentIndex = state.currentQueueIndex;
    if (state.repeatMode === "one") {
      // Restart the already-loaded source instead of resolving the stream again.
      // Re-resolving at the end of every song can fail or leave repeat-one silent.
      if (isLocalTrack(state.currentTrack) || isExternalTrack(state.currentTrack)) {
        audioRef.current?.seekToTime(0);
        void audioContextRef.current?.resume().then(() => audioRef.current?.play());
      } else {
        await player.seekTo(0);
        player.play();
      }
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
    if (nextTrack) {
      await playTrackSafely(nextTrack, state.queue, nextQueueIndex);
      return;
    }

    // When the user's queue is exhausted, ask YouTube Music for its Up Next
    // radio recommendations and append them to the queue for continuous listening.
    if (isExternalTrack(state.currentTrack) && !fetchingAutoplayQueue.current) {
      fetchingAutoplayQueue.current = true;
      try {
        const requestedTrackId = state.currentTrack.id;
        const requestedQueueIndex = state.currentQueueIndex;
        const requestId = playbackRequestSequence.current;
        const videoId = state.currentTrack.youtubeVideoId || state.currentTrack.sourceTrackId?.replace(/^youtube:/i, "") || state.currentTrack.id.replace(/^youtube:/i, "");
        const recommendations = await getYouTubeMusicUpNextTracks(videoId, 20);
        const latest = usePlayerStore.getState();
        // The user may have selected another track while recommendations were loading.
        // Never let a stale radio response override a newer explicit selection.
        if (requestId !== playbackRequestSequence.current ||
            latest.currentTrack?.id !== requestedTrackId ||
            latest.currentQueueIndex !== requestedQueueIndex) return;
        const existingIds = new Set(latest.queue.map((item) => item.id));
        const freshTracks = recommendations.filter((item) => isPlayable(item) && item.id !== requestedTrackId && !existingIds.has(item.id));
        if (freshTracks.length > 0) {
          const expandedQueue = [...latest.queue, ...freshTracks];
          const firstIndex = latest.queue.length;
          await playTrackSafely(freshTracks[0], expandedQueue, firstIndex);
          return;
        }
      } catch {
        // Recommendation lookup is best-effort. Keep playback errors quiet at track end.
      } finally {
        fetchingAutoplayQueue.current = false;
      }
    }

    if (isLocalTrack(state.currentTrack) || isExternalTrack(state.currentTrack)) audioRef.current?.pause();
    else player.pause();
  }, [playTrackSafely, player]);

  const playPrevious = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one" || state.playbackPosition > 3) {
      if (isExternalTrack(state.currentTrack)) await playTrackSafely(state.currentTrack, state.queue, state.currentQueueIndex);
      else if (isLocalTrack(state.currentTrack) || isExternalTrack(state.currentTrack)) audioRef.current?.seekToTime(0);
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
    if (isExternalTrack(state.currentTrack)) await playTrackSafely(state.currentTrack, state.queue, currentIndex);
    else if (isLocalTrack(state.currentTrack) || isExternalTrack(state.currentTrack)) audioRef.current?.seekToTime(0);
    else await player.seekTo(0);
  }, [playTrackSafely, player]);

  const setPlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.max(0.5, Math.min(2, rate));
    setPlaybackRateState(safeRate);
  }, [setPlaybackRateState]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }
    setSleepTimerMinutesState(minutes);
    if (minutes !== null && minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        if (isLocalTrack(usePlayerStore.getState().currentTrack) || isExternalTrack(usePlayerStore.getState().currentTrack)) audioRef.current?.pause();
        else player.pause();
        sleepTimerRef.current = null;
        setSleepTimerMinutesState(null);
      }, minutes * 60_000);
    }
  }, [player, setSleepTimerMinutesState]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const state = usePlayerStore.getState();
    const track = state.currentTrack;
    const target = Math.max(0, state.playbackDuration > 0 ? Math.min(seconds, state.playbackDuration) : seconds);
    if (isLocalTrack(track) || isExternalTrack(track)) {
      audioRef.current?.seekToTime(target);
      return;
    }
    await player.seekTo(target);
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
    const playListener = PlaybackNotificationManager.addEventListener("playbackNotificationPlay", () => {
      const state = usePlayerStore.getState();
      if (state.currentTrack && (state.playbackError || !audioRef.current)) {
        void playTrackSafely(state.currentTrack, state.queue, state.currentQueueIndex);
      } else {
        void audioContextRef.current?.resume().then(() => audioRef.current?.play());
      }
    });
    const pauseListener = PlaybackNotificationManager.addEventListener("playbackNotificationPause", () => audioRef.current?.pause());
    const nextListener = PlaybackNotificationManager.addEventListener("playbackNotificationNextTrack", () => { void playNext(); });
    const previousListener = PlaybackNotificationManager.addEventListener("playbackNotificationPreviousTrack", () => { void playPrevious(); });
    const seekListener = PlaybackNotificationManager.addEventListener("playbackNotificationSeekTo", (event) => audioRef.current?.seekToTime(event.value));
    const forwardListener = PlaybackNotificationManager.addEventListener("playbackNotificationSkipForward", (event) => {
      audioRef.current?.seekToTime(usePlayerStore.getState().playbackPosition + event.value);
    });
    const backwardListener = PlaybackNotificationManager.addEventListener("playbackNotificationSkipBackward", (event) => {
      audioRef.current?.seekToTime(Math.max(0, usePlayerStore.getState().playbackPosition - event.value));
    });
    return () => {
      playListener.remove();
      pauseListener.remove();
      nextListener.remove();
      previousListener.remove();
      seekListener.remove();
      forwardListener.remove();
      backwardListener.remove();
      void PlaybackNotificationManager.hide().catch(() => undefined);
    };
  }, [playNext, playPrevious, playTrackSafely]);

  useEffect(() => {
    if (!currentTrack) {
      void PlaybackNotificationManager.hide().catch(() => undefined);
      return;
    }
    void PlaybackNotificationManager.show({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: "LumaMusic",
      ...(currentTrack.artwork ? { artwork: currentTrack.artwork } : {}),
      duration: Math.max(0, currentTrack.durationMs / 1000),
      elapsedTime: 0,
      state: "paused"
    }).catch(() => undefined);
  }, [currentTrack?.id]);

  useEffect(() => {
    // Expo Audio can keep didJustFinish=true briefly while the next source is loading.
    // Reacting to currentTrack changes as well causes a cascade that skips through
    // the queue and looks like the app is randomly selecting songs.
    if (!status.didJustFinish) {
      handledFinishedState.current = false;
      return;
    }
    if (handledFinishedState.current || isLocalTrack(currentTrack) || isExternalTrack(currentTrack)) return;
    handledFinishedState.current = true;
    if (usePlayerStore.getState().sleepTimerMinutes === -1) {
      player.pause();
      setSleepTimerMinutesState(null);
      return;
    }
    void playNext();
  }, [status.didJustFinish, playNext, player, setSleepTimerMinutesState]);

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
            source={{ uri: localSource.uri, ...(localSource.headers ? { headers: localSource.headers } : {}) }}
            context={audioContextRef.current ?? undefined}
            controls={false}
            playbackRate={playbackRate}
            onLoad={onLocalAudioLoad}
            onError={(error) => {
              setPlaybackError(error.message);
              setPlaybackStatus({ isPlaying: false, isBuffering: false, playbackPosition: 0, playbackDuration: 0, playbackError: error.message });
            }}
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

