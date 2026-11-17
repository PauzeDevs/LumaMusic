# LumaMusic Native Audio Engine Rebuild

## Goal

Bring LumaMusic to functional parity with the playback and Audio Lab feature set observed in Mochy Music, while implementing an independent design. "Parity" means equivalent user-facing capabilities and reliability targets, not identical source code or implementation details. Preserve LumaMusic's existing UI and branding.

## Working rules

- All implementation work for this initiative stays on the `master` working branch. The original `feat/mochy-inspired-audio-architecture` branch is retained as a safety snapshot.
- Never commit this work to `main`, merge it, or publish an APK/release without an explicit request.
- TypeScript owns the cross-platform API, app orchestration, source resolution, settings, persistence, and UI state projection.
- Kotlin owns Android-native playback, media session/service, audio focus, PCM processing, and Android DSP.
- Swift owns the equivalent iOS-native playback and processing. Kotlin is not an iOS runtime.
- The native implementations expose one documented, typed contract to TypeScript.
- Mochy Music is GPL-3.0. Use architectural observations only; do not transplant its source code.
- Do not mark a capability supported until it has been verified on the relevant platform, source, codec, and output route.

## Current baseline

- LumaMusic is an Expo / React Native application using TypeScript.
- The playback provider currently uses `expo-audio` and `react-native-audio-api`.
- Its current Web Audio-style DSP graph is connected to imported local audio, while external YouTube streams are routed directly because the existing graph path can interrupt Android streaming.
- Playback state is currently mirrored through JavaScript stores. The new engine must establish one authoritative native transport state and publish track-scoped updates to TypeScript.
- The Now Playing UI must remain visually unchanged while its position, duration, seek, buffering, source identity, and lifecycle behaviour are corrected.
- Existing screens and Audio Lab controls remain presentation clients of the new engine.

## Target architecture

```
TypeScript application layer
  ├── typed AudioEngine facade and event projection
  ├── source adapters / stream resolver
  ├── queue, preferences, presets, persistence
  └── existing Zustand/UI state
            │
            ▼
Cross-platform native module contract
  ├── Android: Kotlin + Media3 / ExoPlayer
  │     ├── MediaSessionService / notification controls
  │     ├── unified decoder and PCM output pipeline
  │     ├── AudioProcessor chain and DSP
  │     └── post-DSP audio tap
  └── iOS: Swift + AVFoundation / AVAudioEngine
        ├── AVPlayer transport / AVAudioEngine processing graph
        ├── AVAudioSession / remote commands
        ├── native DSP graph
        └── post-DSP audio tap
```

## Feature parity scope

The following capabilities are in scope. Each must have a defined implementation, settings/state contract, source capability handling, and tests.

### Audio Lab and sound processing
- Parametric equaliser with presets, preamp, per-band control, song-specific presets, live updates, and click-free coefficient/filter transitions.
- Peak protection / limiter and clipping-safe gain staging.
- Reverb presets (room, studio, hall) with stable wet/dry mixing and bounded memory.
- Spatial processing: stereo balance, crossfeed, mono compatibility, and virtual spatial/speaker modes only where the signal processing genuinely implements them.
- Loudness management, ReplayGain-style track/album gain, and a loudness-reduction meter.
- Volume curve / perceived loudness controls with safe output limits.
- Silence detection and optional silence skipping, with explicit user controls and no accidental truncation of quiet intros/outros.
- Haptic feedback synchronised to supported playback events, with user opt-out and platform capability checks.
- Song-specific and global presets with debounced persistence and deterministic precedence.
- Per-source and per-device capability reporting; unsupported processing must visibly report bypass rather than pretend to be active.

### Playback and transitions
- Unified transport for local and resolved remote streams.
- Accurate progress, duration, buffered position, seek, rate, repeat, shuffle, queue, and track transitions.
- Background playback, media notification / lock-screen controls, audio focus, interruptions, route changes, and headset controls.
- Gapless or crossmix transitions where supported; crossmix must operate on the actual decoded audio output and must not break queue or source state.
- Silence skipping and crossmix must be independently switchable and tested.
- Hardware offload must be disabled when active DSP requires PCM and restored when the selected pipeline allows it.

### Visualisation and analysis
- Post-processing audio tap using a bounded ring buffer.
- FFT spectrum analyser with windowing, logarithmic frequency mapping, smoothing, and subscription-aware execution.
- Visualisation must represent the actual processed signal, not generated animation or pre-effect samples.
- Capture ownership must be deterministic during transitions and must not add avoidable playback latency.

## DSP implementation rules

- Process decoded PCM in the native output path. Do not route YouTube streams through a fragile JS media-element graph.
- Avoid allocations in the per-sample/per-frame hot path.
- Smooth parameter changes and preserve filter state across buffers.
- Handle supported PCM encodings, sample rates, channel counts, and end-of-stream draining explicitly.
- Keep a safe direct-output bypass. DSP or visualiser failure must never terminate transport.
- Clearly distinguish lossless source formats from lossy codecs and bitrate labels; do not infer lossless from bitrate.
- Apply gain staging and limiting consistently to prevent clipping when multiple effects are enabled.

## Migration phases

### Phase 0 — Baseline and contract
- Map all existing playback paths, dependencies, source resolvers, UI stores, notifications, and persistence.
- Reproduce the current Now Playing and YouTube + EQ/effect failures.
- Define track-scoped native state, commands, events, capabilities, and error semantics.

### Phase 1 — Native transport
- Implement Android Kotlin transport with Media3 and media-session lifecycle.
- Implement equivalent iOS Swift transport with AVFoundation / AVAudioEngine.
- Keep the existing UI and source resolver; route commands through a compatibility facade.
- Verify local/remote playback, seek, duration, track replacement, interruptions, background playback, and notification controls.

### Phase 2 — Core DSP
- Integrate EQ, preamp, and limiter into decoded PCM output.
- Verify live changes do not stop, restart, flush, or replace the active track.
- Add reverb, balance, mono/crossfeed, spatial processing, loudness management, and presets.

### Phase 3 — Advanced Audio Lab
- Add silence detection/skipping, haptic integration, volume curves, ReplayGain-style metadata, and song-specific presets.
- Add capability reporting and safe bypass for unsupported combinations.

### Phase 4 — Transitions and analysis
- Implement crossmix/crossfade after single-track transport and DSP are stable.
- Add post-DSP audio tap, ring buffer, FFT, and spectrum analyser.

### Phase 5 — Reliability and optimisation
- Add DSP unit tests, player state tests, source/codec compatibility tests, lifecycle tests, and device-level instrumentation.
- Profile CPU, allocations, latency, battery, and memory.
- Validate output through wired, Bluetooth, speaker, and other available routes.
- Only enable offload or other optimisations when they do not violate active DSP requirements.

### Phase 6 — Controlled integration
- Remove legacy playback paths only after parity is demonstrated.
- Keep the existing UI unchanged unless a functional contract requires a narrowly scoped correction.
- Run repository checks and device tests; report anything that cannot be validated in CI.
- No release APK or production release unless explicitly requested.

## Acceptance criteria

- EQ and effects do not stop, restart, or silently replace the active track.
- Now Playing position and duration remain correct through pause/resume, seek, buffering, source replacement, app background/foreground, and track transitions.
- Late events from a previous track cannot overwrite the current track's state.
- Local and YouTube playback have explicit, tested capability reporting.
- Audio Lab controls change the actual audible output, not merely persisted UI values.
- Visualisation is derived from real post-processing samples.
- DSP exceptions or unsupported formats fall back safely without killing playback.
- Android and iOS expose equivalent documented behaviour, with honest platform-specific limitations.
- Existing screens, navigation, branding, and layout remain unchanged.

## Non-goals

- No redesign of Now Playing or Audio Lab UI.
- No production changes to `main`.
- No APK or release without explicit instruction.
- No copying of Mochy Music source code.
