# Native Streaming DSP: Safe Integration RFC

**Status:** Investigation / design only  
**Branch:** `experiment/native-streaming-dsp-rfc`  
**Runtime status:** No streaming, playback, UI, dependency, or release code is changed by this RFC.

## Objective

Restore live Equalizer processing for remote YouTube Music tracks without destabilising stream playback.

The current safety fix intentionally keeps remote streams on the existing direct-output path. That path must remain the default until a replacement has passed automated checks and physical-device playback tests.

## Current architecture and failure boundary

- `services/youtubePlayback.ts` resolves a remote media URL and returns its MIME type, duration, bitrate, user agent, and expiry.
- `AudioPlayerProvider` owns queue state, transport controls, recovery, progress, and the native `Audio` component.
- Imported local tracks can be routed through `react-native-audio-api`'s Web Audio-style graph.
- Remote tracks currently bypass `MediaElementAudioSourceNode` and play directly. This is deliberate: the previous graph route was associated with streaming interruptions when Audio Lab was enabled.
- The app currently pins `react-native-audio-api` to `^1.0.0`. Its published Web Audio coverage table reports the `MediaElementAudioSourceNode` implementation as incomplete (0/7 assertions in the v1.0.0 table). Re-enabling the same route or merely changing EQ coefficients is not an acceptable fix.

## Options assessed

### A. Re-enable the existing media-element DSP graph

**Decision: reject for now.**

It reintroduces the exact routing boundary implicated in the playback failure. A version bump alone is insufficient without a reproducible Android test showing that remote streaming, seeking, buffering, and effects remain stable.

### B. Attach Android's platform Equalizer effect to the active audio session

**Decision: possible Android-only experiment, not the cross-platform design.**

Android exposes session-bound audio effects, but the current `AudioTagHandle` surface used by the app does not expose a documented audio-session ID. Adding a native session-ID bridge would require changes to or a supported extension point in the playback library. Platform Equalizer support and band layouts can vary by device and OEM. It also does not solve iOS.

Do not create an arbitrary session ID and attach an effect to it: it must be the session actually used by the playing output.

### C. Native post-decode DSP in the playback pipeline

**Decision: preferred long-term direction.**

Use a native streaming backend that accepts the same resolved media URL and request headers, decodes audio as it already does, and applies DSP to decoded PCM before output.

- **Android:** evaluate Media3/ExoPlayer with a custom `AudioProcessor` chain. The processor should handle supported PCM encodings, preserve channel count and timestamps, and avoid blocking or allocating in the audio render callback.
- **iOS:** evaluate an AVFoundation-native route that exposes decoded PCM for processing (for example, a supported audio tap / engine route). Prove progressive network playback, buffering, seeking, background playback, and route changes before selecting the implementation.
- **Shared interface:** expose only transport-neutral operations to TypeScript: enable/disable EQ, set the five existing band gains, and report effect capability/state. Keep queue, track resolution, history, and UI ownership in the existing app layer.
- Keep the current backend available as an immediate fallback. A native DSP failure must never leave the user with silence: fall back to the unchanged direct-output backend and surface that effects are unavailable for that track.

A DSP processor must not fetch, download, persist, proxy, or redistribute stream media. It processes the same playback bytes the existing player already receives.

## Integration constraints

1. Do not modify `services/youtubePlayback.ts`, `services/newPipeResolver.ts`, or stream URL caching as part of the DSP work.
2. Do not change track selection, queue transitions, autoplay, retry logic, playback position, sleep timer, notification controls, or background-audio configuration.
3. Do not change Audio Lab layout or visual design.
4. Do not add a new native dependency until a minimal native proof of concept builds on both platforms.
5. Keep the experimental backend behind a build-time feature flag that defaults to **off**.
6. The current direct-output backend remains the default and must be selectable as a rollback path.
7. No stable APK or release is produced automatically.

## Proposed implementation phases

### Phase 0: Verify native playback ownership

- Confirm the exact Android and iOS native player implementations used by `react-native-audio-api` 1.0.0.
- Confirm whether either implementation exposes a supported audio-session or decoded-PCM extension point.
- Inspect the installed Expo SDK / React Native compatibility before selecting Media3 versions or native module APIs.
- Record a reproducible failure test for the old media-element graph and a baseline test for direct-output playback.

### Phase 1: Isolated Android proof of concept

- Add a separate native module or backend adapter; do not modify the current provider path.
- Start with a single bypassable five-band EQ processor.
- Use the same URL, headers, and resolver output as the existing player.
- Add a hard runtime default of direct output; enable the prototype only in a development build.
- Test on physical Android devices, including at least one device with a different OEM audio stack.

### Phase 2: iOS proof of concept

- Select a supported AVFoundation processing route based on verified API behaviour.
- Match the Android five-band frequency and gain semantics.
- Keep iOS on the existing backend until the native route passes the same acceptance tests.

### Phase 3: Controlled integration

- Integrate behind the build-time flag.
- Preserve all existing player state and transport APIs.
- Add automatic fallback to direct output if native DSP initialisation or processing fails.
- Expose effect availability to the existing Audio Lab state without redesigning the screen.

### Phase 4: Release gate

Do not enable the new backend by default until all of the following pass:

- TypeScript, Expo dependency, Android native build, and iOS native build checks.
- YouTube stream starts with EQ off and on.
- Live band changes do not pause, restart, seek, or interrupt the stream.
- 30-minute continuous playback without crash, memory growth, or unexpected completion.
- Buffering, seek, pause/resume, next/previous, repeat, shuffle, and autoplay.
- Background playback, lock-screen controls, notification actions, phone-call interruption, app foreground/background transitions.
- Wired, Bluetooth, and speaker route changes.
- Effect initialisation failure and runtime failure both fall back to direct output.
- Imported local tracks retain their current DSP behaviour.
- Physical-device QA on Android and iOS.

## Acceptance criteria

The feature is complete only when a user can adjust the existing EQ bands during a remote stream without playback interruption, while all existing transport and recovery behaviour remains intact.

A green JavaScript-only CI run is not sufficient evidence for native audio stability. Physical-device playback validation is mandatory.

## References

- React Native Audio API Web Audio coverage: https://docs.swmansion.com/react-native-audio-api/docs/other/web-audio-api-coverage/
- React Native Audio API Audio tag: https://docs.swmansion.com/react-native-audio-api/docs/sources/audio-tag/
- Android Media3 ExoPlayer API: https://developer.android.com/reference/androidx/media3/exoplayer/ExoPlayer
- Android NDK audio session API: https://developer.android.com/ndk/reference/group/audio

