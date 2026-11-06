import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, type PropsWithChildren } from "react";
import { getAudiusStreamUrl } from "../services/audius";
import { useLibraryStore } from "../store/library";
import { usePlayerStore } from "../store/player";
import type { MusicTrack } from "../types/music";

type AudioEngineValue = {
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => Promise<void>;
  togglePlayback: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const AudioEngineContext = createContext<AudioEngineValue | null>(null);

function isPlayable(track: MusicTrack | undefined): track is MusicTrack {
  return Boolean(track && track.source === "audius" && track.sourceTrackId && track.isStreamable);
}

export function AudioPlayerProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const setTrack = usePlayerStore((state) => state.setTrack);
  const setPlaybackStatus = usePlayerStore((state) => state.setPlaybackStatus);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
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

  const playTrack = useCallback(async (track: MusicTrack, nextQueue?: MusicTrack[]) => {
    if (!isPlayable(track)) {
      throw new Error("This track is not available for streaming through Audius.");
    }

    try {
      setPlaybackError(null);
      setTrack(track, nextQueue);
      useLibraryStore.getState().addRecentTrack(track);
      player.replace(getAudiusStreamUrl(track.sourceTrackId));
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: "LumaMusic",
        artworkUrl: track.artwork
      }, {
        showSeekBackward: true,
        showSeekForward: true
      });
      player.play();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start this track.";
      setPlaybackError(message);
      throw new Error(message);
    }
  }, [player, setPlaybackError, setTrack]);

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
    if (status.didJustFinish) void playNext();
  }, [status.didJustFinish, playNext]);

  const seekTo = useCallback(async (seconds: number) => {
    await player.seekTo(Math.max(0, seconds));
  }, [player]);

  const value: AudioEngineValue = {
    playTrack,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
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