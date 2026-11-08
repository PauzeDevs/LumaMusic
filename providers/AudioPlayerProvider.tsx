import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useRef, type PropsWithChildren } from "react";
import { Linking } from "react-native";
import { useLibraryStore } from "../store/library";
import { usePlayerStore } from "../store/player";
import type { MusicTrack } from "../types/music";

type AudioEngineValue = {
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => Promise<void>;
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

function isExternalTrack(track: MusicTrack | null | undefined): track is MusicTrack {
  return Boolean(track?.source === "youtube_music" && track.youtubeUrl);
}

function isPlayable(track: MusicTrack | undefined): track is MusicTrack {
  return isExternalTrack(track);
}

export function AudioPlayerProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPlaybackStatus = usePlayerStore((state) => state.setPlaybackStatus);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const setPlaybackRateState = usePlayerStore((state) => state.setPlaybackRate);
  const setSleepTimerMinutesState = usePlayerStore((state) => state.setSleepTimerMinutes);
  const toggleShuffleState = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatState = usePlayerStore((state) => state.cycleRepeat);
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix"
    }).catch((error: unknown) => {
      setPlaybackError(error instanceof Error ? error.message : "Could not configure audio playback.");
    });
  }, [setPlaybackError]);

  useEffect(() => {
    // YouTube Music owns playback after the handoff. Do not overwrite its
    // track metadata with the idle status of LumaMusic's native audio player.
    if (isExternalTrack(currentTrack)) return;
    setPlaybackStatus({
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      playbackPosition: status.currentTime,
      playbackDuration: status.duration,
      playbackError: status.error ?? null
    });
  }, [status.playing, status.isBuffering, status.currentTime, status.duration, status.error, setPlaybackStatus, currentTrack?.id]);

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (isExternalTrack(usePlayerStore.getState().currentTrack)) {
      setSleepTimerMinutesState(null);
      return;
    }
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerMinutesState(minutes);
    if (minutes !== null && minutes > 0) {
      sleepTimerRef.current = setTimeout(() => {
        player.pause();
        sleepTimerRef.current = null;
        setSleepTimerMinutesState(null);
      }, minutes * 60_000);
    }
  }, [player, setSleepTimerMinutesState]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (isExternalTrack(usePlayerStore.getState().currentTrack)) return;
    const safeRate = Math.max(0.5, Math.min(2, rate));
    player.setPlaybackRate(safeRate, "high");
    setPlaybackRateState(safeRate);
  }, [player, setPlaybackRateState]);

  const playTrack = useCallback(async (track: MusicTrack, nextQueue?: MusicTrack[]) => {
    if (!isExternalTrack(track)) {
      throw new Error("This track has no supported playback destination.");
    }
    const queue = nextQueue?.length ? nextQueue : [track];
    usePlayerStore.getState().setTrack(track, queue);
    usePlayerStore.getState().setPlaybackStatus({
      isPlaying: false,
      isBuffering: false,
      playbackPosition: 0,
      playbackDuration: Math.max(0, track.durationMs / 1000),
      playbackError: null
    });
    useLibraryStore.getState().addRecentTrack(track);
    await Linking.openURL(track.youtubeUrl);
  }, []);

  const playTrackSafely = useCallback(async (track: MusicTrack, queue: MusicTrack[]) => {
    try {
      await playTrack(track, queue);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Unable to open this track.");
    }
  }, [playTrack, setPlaybackError]);

  const togglePlayback = useCallback(() => {
    const state = usePlayerStore.getState();
    if (isExternalTrack(state.currentTrack)) {
      void playTrack(state.currentTrack, state.queue).catch((error: unknown) => {
        setPlaybackError(error instanceof Error ? error.message : "Could not open YouTube Music.");
      });
      return;
    }
    if (status.playing) player.pause();
    else if (state.currentTrack) player.play();
  }, [playTrack, player, setPlaybackError, status.playing]);

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one") {
      if (isExternalTrack(state.currentTrack)) await playTrackSafely(state.currentTrack, state.queue);
      else { await player.seekTo(0); player.play(); }
      return;
    }

    const currentIndex = state.queue.findIndex((item) => item.id === state.currentTrack?.id);
    let nextTrack: MusicTrack | undefined;

    if (state.isShuffled) {
      const candidates = state.queue.filter((item) => item.id !== state.currentTrack?.id && isPlayable(item));
      if (candidates.length > 0) nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
      else if (state.repeatMode === "all") nextTrack = state.queue.find(isPlayable);
    } else {
      for (let offset = 1; offset <= state.queue.length; offset += 1) {
        let index = currentIndex + offset;
        if (index >= state.queue.length) {
          if (state.repeatMode === "off") break;
          index %= state.queue.length;
        }
        const candidate = state.queue[index];
        if (isPlayable(candidate)) { nextTrack = candidate; break; }
      }
    }

    if (nextTrack) await playTrackSafely(nextTrack, state.queue);
    else if (!isExternalTrack(state.currentTrack)) player.pause();
  }, [playTrackSafely, player]);

  const playPrevious = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one" || (!isExternalTrack(state.currentTrack) && status.currentTime > 3)) {
      if (isExternalTrack(state.currentTrack)) await playTrackSafely(state.currentTrack, state.queue);
      else await player.seekTo(0);
      return;
    }

    const currentIndex = state.queue.findIndex((item) => item.id === state.currentTrack?.id);
    for (let offset = 1; offset <= state.queue.length; offset += 1) {
      let index = currentIndex - offset;
      if (index < 0) {
        if (state.repeatMode === "off") break;
        index = (index % state.queue.length + state.queue.length) % state.queue.length;
      }
      const candidate = state.queue[index];
      if (isPlayable(candidate)) {
        await playTrackSafely(candidate, state.queue);
        return;
      }
    }
    if (isExternalTrack(state.currentTrack)) await playTrackSafely(state.currentTrack, state.queue);
    else await player.seekTo(0);
  }, [playTrackSafely, player, status.currentTime]);

  useEffect(() => {
    if (!status.didJustFinish || isExternalTrack(currentTrack)) return;
    if (usePlayerStore.getState().sleepTimerMinutes === -1) {
      player.pause();
      setSleepTimerMinutesState(null);
      return;
    }
    void playNext();
  }, [status.didJustFinish, currentTrack?.id, playNext, player, setSleepTimerMinutesState]);

  const seekTo = useCallback(async (seconds: number) => {
    if (isExternalTrack(usePlayerStore.getState().currentTrack)) return;
    await player.seekTo(Math.max(0, seconds));
  }, [player]);

  const value: AudioEngineValue = {
    playTrack,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    setPlaybackRate,
    setSleepTimer,
    toggleShuffle: toggleShuffleState,
    cycleRepeat: cycleRepeatState
  };

  return <AudioEngineContext.Provider value={value}>{children}</AudioEngineContext.Provider>;
}

export function useAudioEngine() {
  const context = useContext(AudioEngineContext);
  if (!context) throw new Error("useAudioEngine must be used inside AudioPlayerProvider.");
  return context;
}
