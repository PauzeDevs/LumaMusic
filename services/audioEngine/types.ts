/** Cross-platform contract for the native LumaMusic audio engine. */
export type AudioSourceKind = "local" | "youtube_music" | "other";

export type AudioEngineCapabilities = {
  nativePlayback: boolean;
  equalizer: boolean;
  limiter: boolean;
  reverb: boolean;
  spatial: boolean;
  audioTap: boolean;
  sourceKind: AudioSourceKind;
  reasonUnavailable?: string;
};

export type AudioEngineTrack = {
  id: string;
  uri: string;
  title: string;
  artist?: string;
  artworkUri?: string;
  mimeType?: string;
  headers?: Record<string, string>;
  durationSeconds?: number;
  sourceKind: AudioSourceKind;
};

export type DecodedAudioFormat = {
  sampleRateHz: number;
  channelCount: number;
  pcmEncoding: "PCM_16BIT" | "PCM_FLOAT";
  bitDepth: 16 | 32;
};

export type AudioEngineState = {
  trackId: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionSeconds: number;
  durationSeconds: number;
  bufferedSeconds: number;
  playbackRate: number;
  error: string | null;
  isEnded: boolean;
  decodedAudioFormat?: DecodedAudioFormat | null;
};

export type AudioLabConfiguration = {
  enabled: boolean;
  /** Five fixed bands: 60, 250, 1000, 4000, 12000 Hz. */
  equalizerDb: readonly [number, number, number, number, number];
  preampDb: number;
  limiterEnabled: boolean;
  reverbPreset: "off" | "room" | "studio" | "hall";
  spatialBalance: number;
};

export interface NativeAudioEngine {
  getCapabilities(sourceKind: AudioSourceKind): Promise<AudioEngineCapabilities>;
  getState(): Promise<AudioEngineState>;
  load(track: AudioEngineTrack, startPositionSeconds?: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionSeconds: number): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  setAudioLab(configuration: AudioLabConfiguration): Promise<void>;
  release(): Promise<void>;
}
