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

function isPlayable(track: MusicTrack | undefined): track is MusicTrack {
  return Boolean(track?.youtubeUrl);
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
    setPlaybackStatus({
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      playbackPosition: status.currentTime,
      playbackDuration: status.duration,
      playbackError: status.error ?? null
    });
  }, [status.playing, status.isBuffering, status.currentTime, status.duration, status.error, setPlaybackStatus]);

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
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
    const safeRate = Math.max(0.5, Math.min(2, rate));
    player.setPlaybackRate(safeRate, "high");
    setPlaybackRateState(safeRate);
  }, [player, setPlaybackRateState]);

  const playTrack = useCallback(async (track: MusicTrack) => {
    if (track.youtubeUrl) {
      setPlaybackError(null);
      useLibraryStore.getState().addRecentTrack(track);
      await Linking.openURL(track.youtubeUrl);
      return;
    }
    throw new Error("This track has no supported native playback source.");
  }, [setPlaybackError]);

  const playTrackSafely = useCallback(async (track: MusicTrack, queue: MusicTrack[]) => {
    try {
      await playTrack(track, queue);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : "Unable to play the next track.");
    }
  }, [playTrack, setPlaybackError]);

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      player.pause();
    } else if (usePlayerStore.getState().currentTrack) {
      player.play();
    }
  }, [player, status.playing]);

  const playNext = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one") {
      await player.seekTo(0);
      player.play();
      return;
    }

    const currentIndex = state.queue.findIndex((item) => item.id === state.currentTrack?.id);
    let nextTrack: MusicTrack | undefined;

    if (state.isShuffled) {
      const candidates = state.queue.filter((item) => item.id !== state.currentTrack?.id && isPlayable(item));
      if (candidates.length > 0) {
        nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
      } else if (state.repeatMode === "all") {
        await player.seekTo(0);
        player.play();
        return;
      }
    } else {
      for (let offset = 1; offset <= state.queue.length; offset += 1) {
        let index = currentIndex + offset;
        if (index >= state.queue.length) {
          if (state.repeatMode === "off") break;
          index %= state.queue.length;
        }
        const candidate = state.queue[index];
        if (isPlayable(candidate)) {
          nextTrack = candidate;
          break;
        }
      }
    }

    if (nextTrack) {
      await playTrackSafely(nextTrack, state.queue);
    } else {
      player.pause();
    }
  }, [playTrackSafely, player]);

  const playPrevious = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one" || status.currentTime > 3) {
      await player.seekTo(0);
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
    await player.seekTo(0);
  }, [playTrackSafely, player, status.currentTime]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    if (usePlayerStore.getState().sleepTimerMinutes === -1) {
      player.pause();
      setSleepTimerMinutesState(null);
      return;
    }
    void playNext();
  }, [status.didJustFinish, playNext, player, setSleepTimerMinutesState]);

  const seekTo = useCallback(async (seconds: number) => {
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
