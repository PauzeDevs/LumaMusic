import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, type PropsWithChildren } from "react";
import { getAudiusStreamUrl } from "../services/audius";
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
    if (track.source !== "audius" || !track.sourceTrackId) {
      throw new Error("This is sample content. Choose a playable Audius track.");
    }
    if (!track.isStreamable) {
      throw new Error("This track is not available for streaming through Audius.");
    }

    try {
      setPlaybackError(null);
      setTrack(track, nextQueue);
      player.replace(getAudiusStreamUrl(track.sourceTrackId));
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: "LumaMusic",
        artworkUrl: track.artwork
      });
      player.play();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start this track.";
      setPlaybackError(message);
      throw new Error(message);
    }
  }, [player, setPlaybackError, setTrack]);

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

    if (state.isShuffled && state.queue.length > 1) {
      const candidates = state.queue.filter((item) => item.id !== state.currentTrack?.id);
      nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= state.queue.length && state.repeatMode === "off") {
        player.pause();
        return;
      }
      nextTrack = state.queue[nextIndex % state.queue.length];
    }

    if (nextTrack) await playTrack(nextTrack, state.queue);
  }, [playTrack, player]);

  const playPrevious = useCallback(async () => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0 || !state.currentTrack) return;
    if (state.repeatMode === "one") {
      await player.seekTo(0);
      player.play();
      return;
    }
    const currentIndex = state.queue.findIndex((item) => item.id === state.currentTrack?.id);
    if (status.currentTime > 3 || (currentIndex <= 0 && state.repeatMode === "off")) {
      await player.seekTo(0);
      return;
    }
    const previousIndex = currentIndex <= 0 ? state.queue.length - 1 : currentIndex - 1;
    await playTrack(state.queue[previousIndex], state.queue);
  }, [playTrack, player, status.currentTime]);

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