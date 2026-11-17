# LumaMusic Native Audio Engine Rebuild

## Goal

Bring LumaMusic's playback and Audio Lab architecture toward the reliability and DSP integration demonstrated by Mochy Music, while implementing an independent design. Do not copy Mochy Music source code. Preserve LumaMusic's existing product UI and public playback behaviour unless a change is required to correct a verified defect.

## Working rules

- All work for this initiative stays on `feat/mochy-inspired-audio-architecture`.
- Never commit this work to `main`, merge it, or publish an APK/release without an explicit request.
- TypeScript owns the cross-platform API, application orchestration, source resolution, settings, and typed UI state.
- Kotlin owns Android-native playback, audio focus/session integration, foreground playback service, PCM processing, and Android DSP.
- Swift owns the corresponding iOS-native playback and audio processing implementation. Kotlin is not an iOS runtime.
- The native implementations must expose the same typed contract to TypeScript.
- Do not transplant Mochy Music code. Its repository is GPL-3.0; use architectural ideas only unless a separately reviewed, compliant reuse decision is made.
- Do not claim a feature is supported until it has been tested on each applicable source/platform path.

## Current baseline observations

- LumaMusic is an Expo / React Native application using TypeScript.
- The playback provider currently uses both `expo-audio` and `react-native-audio-api`.
- The current Web Audio-style DSP graph is only connected for local/imported audio. External YouTube streams intentionally use a direct-output route because the existing media-element DSP route can interrupt Android streaming.
- The current provider and UI store maintain playback state in JavaScript. The rebuild must define one authoritative native transport state and mirror it into TypeScript.
- The Now Playing screen consumes application state; its progress, duration, seek, buffering, and track identity must be verified end-to-end rather than patched visually.
- The app already has a substantial existing UI and audio settings screen. These should remain presentation clients of the new engine, not be rewritten as part of the engine migration.

## Target architecture

```
TypeScript application layer
  ├── typed AudioEngine facade
  ├── source adapters / stream resolver
  ├── queue, preferences, persistence
  └── Zustand/UI state projection
            │
            ▼
Cross-platform native module contract
  ├── Android: Kotlin + Media3 / ExoPlayer
  │     ├── playback service + media session
  │     ├── unified decoder/output pipeline
  │     ├── PCM AudioProcessor chain
  │     └── post-processing audio tap
  └── iOS: Swift + AVFoundation / AVAudioEngine
        ├── AVPlayer / AVAudioEngine transport
        ├── AVAudioSession + remote commands
        ├── native DSP graph
        └── post-processing tap
```

## Native engine responsibilities

1. Own transport: load, play, pause, seek, next, previous, rate, repeat, shuffle, queue, and lifecycle.
2. Emit authoritative, track-scoped state: track ID, source instance, duration, position, buffered position, playing/buffering/ended/error state, and capabilities.
3. Keep source resolution separate from playback. Resolved URLs, MIME types, headers, expiry, and source metadata must reach the native player without being mistaken for UI state.
4. Process supported decoded PCM in the native output pipeline. Avoid routing remote streams through a fragile JavaScript/Web Audio media-element graph.
5. Apply live parameter changes without flushing or restarting the player. Use smoothed parameter ramps and click-free filter-bank transitions where practical.
6. Disable or bypass hardware offload when software DSP requires decoded PCM; restore eligible offload when the active chain permits it.
7. Provide a post-DSP audio tap for visualisation, with bounded ring buffers and no unbounded per-frame allocations.
8. Fail safely: a DSP or visualiser failure must not stop transport. A direct-output fallback must remain available.

## DSP scope and order

- Parametric equaliser with configurable bands, preamp, smoothing, and peak protection.
- Reverb with bounded impulse/feedback memory and stable wet/dry mixing.
- Stereo balance / crossfeed / spatial processing, with clearly named controls that match the actual signal operation.
- Loudness management / ReplayGain-style gain staging, with clipping protection.
- Crossfade only after single-player transport, queue transitions, and source compatibility are stable.
- Visualiser fed from the processed output tap, not fabricated animation data.

## Migration strategy

### Phase 0 — Baseline and contract
- Map every current playback path and dependency.
- Capture current Now Playing, queue, notification, background, and source-resolution contracts.
- Add reproducible tests for current failures before changing behaviour.
- Define the TypeScript/native event and command contract.

### Phase 1 — Native transport foundation
- Implement Android Kotlin transport and media session.
- Implement the equivalent iOS Swift transport.
- Keep the existing UI and source resolver; route commands through a compatibility facade.
- Verify local and remote playback, seek, duration, track replacement, interruptions, background playback, and notification controls.

### Phase 2 — Native DSP
- Add EQ and limiter first, then reverb and spatial processing.
- Ensure YouTube streams and local files enter the same decoded processing path where supported.
- Preserve a safe bypass path and expose accurate capability state per source/device.

### Phase 3 — Audio tap and visualisation
- Add post-processing capture, bounded ring buffer, FFT analysis, and subscription-aware work.
- Verify that visualisation reflects the actual audible processed signal.

### Phase 4 — Reliability and optimisation
- Add DSP unit tests, player state tests, source compatibility tests, lifecycle tests, and device-level instrumentation.
- Profile CPU, allocations, latency, battery, and memory.
- Only enable optimisations such as offload when they do not violate active DSP requirements.

### Phase 5 — Controlled integration
- Remove legacy playback paths only after parity is demonstrated.
- Keep the existing UI unchanged unless a functional contract requires a targeted adjustment.
- Run repository checks and device tests; report anything that cannot be validated in CI.

## Acceptance criteria

- EQ/effects changes do not stop, restart, or silently replace the active track.
- Now Playing position and duration remain correct through pause/resume, seek, buffering, source replacement, app background/foreground, and track transitions.
- Late events from a previous track cannot overwrite the current track's state.
- Local and YouTube playback have explicit, tested capability reporting.
- Audio Lab controls change the actual output, not merely persisted UI values.
- Visualisation is derived from real post-processing audio samples.
- DSP exceptions or unsupported formats fall back safely without killing playback.
- Android and iOS expose equivalent documented behaviour, with platform-specific limitations reported honestly.
- Existing app screens, navigation, branding, and layout remain unchanged during engine work.

## Non-goals

- No redesign of Now Playing or Audio Lab UI.
- No release APK or production release.
- No changes to `main`.
- No blind copying of Mochy Music source code.
