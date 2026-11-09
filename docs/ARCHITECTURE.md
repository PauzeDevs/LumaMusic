# LumaMusic Technical Architecture

**Status:** YouTube Music catalogue discovery, an authorized stream-resolver client contract, in-app remote playback plumbing through Expo Audio, and local playback.

## Architecture overview

- TypeScript React Native client built with Expo.
- Expo Router for screens.
- TanStack Query for remote discovery and caching.
- Zustand for player and library state.
- AsyncStorage for favourites, recent selections and local playlists.
- `services/youtubeMusic.ts` isolates catalogue discovery.
- `services/authorizedPlayback.ts` resolves a track through an independently operated, authorized HTTPS playback service.
- `AudioPlayerProvider` owns local and resolved remote playback, transport controls and player state.

## Provider boundaries

YouTube Music catalogue discovery currently uses an undocumented web endpoint. It is unofficial, can change without notice, and is not a public Google API.

Playback is deliberately separate from catalogue discovery. A YouTube Music track is passed to `services/authorizedPlayback.ts`, which calls the HTTPS endpoint configured by `EXPO_PUBLIC_YOUTUBE_PLAYBACK_RESOLVER_URL`. The resolver accepts a video ID and returns a short-lived HTTPS audio URL, with optional MIME type, expiry and request headers.

The resolver backend is not included in this repository. It must only return streams that its operator is authorized and contractually permitted to provide to LumaMusic. The client does not implement signature deciphering, cookie extraction, PoToken generation, or undocumented access-control workarounds. If no resolver is configured, playback reports a clear error instead of opening another app or pretending to play.

## Playback behavior

- Imported local files use the local audio graph and effects.
- Resolved remote streams are loaded into the in-app Expo Audio player.
- Remote tracks use LumaMusic play/pause, live progress, seek, playback-rate, repeat, sleep-timer and queue controls.
- The resolver is called for each play request because stream URLs may expire.
- The current remote playback engine is Expo Audio. A dedicated Android Media3 MediaLibraryService and React Native bridge are still required for full Mochy-style native media-session, notification, lock-screen and headset-control parity.
- Remote stream expiry recovery and automatic re-resolution are not yet implemented.

## Track model

- `id`: stable source-namespaced identifier.
- `source`: provider identifier.
- `sourceTrackId` / `youtubeVideoId`: source identifiers.
- `title`, `artist`, `artwork`, `durationMs`.
- `youtubeUrl`: canonical YouTube Music page, retained for sharing and attribution.
- `localUri`: private app-storage URI for imported audio.
- `isStreamable`: native playback capability, not catalogue availability.

## Reliability and privacy

- Debounce search and cache results with bounded stale times.
- Handle HTTP errors and empty responses without fabricated catalogue data.
- Do not embed account cookies, passwords, bearer tokens or private credentials in the app.
- Do not download, cache, re-host or redistribute provider audio without authorization.
- Require HTTPS for resolver endpoints and returned stream URLs.

## Validation gates

1. Validate catalogue parsing and rate-limit handling on Android/iOS.
2. Validate local playback, remote playback, queue transitions, seeking and sleep timer.
3. Validate the resolver contract and provider authorization before production streaming.
4. Add a dedicated Android Media3 MediaLibraryService bridge for native notification, lock-screen, headset and Android Auto session parity.
5. Run development builds and physical-device QA for audio focus, interruptions, Bluetooth and background behavior.
