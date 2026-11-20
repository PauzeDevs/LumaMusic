import { requireOptionalNativeModule, type EventSubscription } from "expo-modules-core";
import type {
  AudioEngineCapabilities,
  AudioEngineState,
  AudioEngineTrack,
  AudioLabConfiguration,
  AudioSourceKind,
} from "../../../services/audioEngine/types";

type NativeAudioEventMap = {
  onStateChange: AudioEngineState;
  onCrossfadeComplete: { trackId: string };
};

type NativeAudioEngineModule = {
  getCapabilities(sourceKind: AudioSourceKind): Promise<AudioEngineCapabilities>;
  getState(): Promise<AudioEngineState>;
  load(track: AudioEngineTrack, startPositionSeconds?: number): Promise<void>;
  prepareNext(track: AudioEngineTrack): Promise<void>;
  startCrossfade(durationSeconds: number): Promise<void>;
  cancelCrossfade(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionSeconds: number): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  setAudioLab(configuration: AudioLabConfiguration): Promise<void>;
  release(): Promise<void>;
  addListener<K extends keyof NativeAudioEventMap>(
    eventName: K,
    listener: (event: NativeAudioEventMap[K]) => void
  ): EventSubscription;
};

const nativeModule = requireOptionalNativeModule<NativeAudioEngineModule>("LumaAudioEngine");


export const isNativeAudioEngineAvailable = Boolean(nativeModule);

export async function getNativeAudioEngineCapabilities(sourceKind: AudioSourceKind): Promise<AudioEngineCapabilities> {
  if (!nativeModule) {
    return { nativePlayback: false, equalizer: false, limiter: false, reverb: false, spatial: false, audioTap: false, sourceKind, reasonUnavailable: "Native audio engine is not installed in this build." };
  }
  return nativeModule.getCapabilities(sourceKind);
}

export async function getNativeAudioEngineState(): Promise<AudioEngineState> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.getState();
}

export async function loadNativeAudioTrack(track: AudioEngineTrack, startPositionSeconds = 0): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.load(track, startPositionSeconds);
}

export async function prepareNativeNextTrack(track: AudioEngineTrack): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.prepareNext(track);
}

export async function startNativeAudioCrossfade(durationSeconds: number): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.startCrossfade(durationSeconds);
}

export async function cancelNativeAudioCrossfade(): Promise<void> {
  if (!nativeModule) return;
  return nativeModule.cancelCrossfade();
}

export async function playNativeAudio(): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.play();
}

export async function pauseNativeAudio(): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.pause();
}

export async function seekNativeAudio(positionSeconds: number): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.seekTo(positionSeconds);
}

export async function setNativeAudioPlaybackRate(rate: number): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.setPlaybackRate(rate);
}

export async function setNativeAudioLab(configuration: AudioLabConfiguration): Promise<void> {
  if (!nativeModule) throw new Error("Native audio engine is not installed in this build.");
  return nativeModule.setAudioLab(configuration);
}

export async function releaseNativeAudioEngine(): Promise<void> {
  if (nativeModule) await nativeModule.release();
}

export function addNativeAudioStateListener(listener: (state: AudioEngineState) => void): EventSubscription | null {
  if (!nativeModule) return null;
  return nativeModule.addListener("onStateChange", listener);
}

export function addNativeAudioCrossfadeCompleteListener(listener: (event: { trackId: string }) => void): EventSubscription | null {
  if (!nativeModule) return null;
  return nativeModule.addListener("onCrossfadeComplete", listener);
}
