# LumaMusic Technical Architecture

**Status:** YouTube Music catalogue discovery with official-app handoff; native playback for imported local audio.

## Architecture overview
- TypeScript React Native client built with Expo.
- Expo Router for screens.
- TanStack Query for remote discovery and caching.
- Zustand for player and library state.
- AsyncStorage for favourites, recent selections and local playlists.
- `services/youtubeMusic.ts` isolates public catalogue discovery.
- `AudioPlayerProvider` owns local playback and player state.

## Provider boundaries
YouTube Music is currently a discovery source. Search results are normalized into app-owned models and opened using canonical YouTube Music URLs. The integration uses an undocumented web endpoint and can change without notice. It is not an official Google API.

LumaMusic does not extract or redistribute YouTube audio. A future native streaming provider must use an authorized playback interface for its intended use and respect access controls and provider terms.

Local files imported by the user are copied into the app's private documents directory and played through the native audio engine. The library and playlists are local-first.

## Track model
- `id`: stable source-namespaced identifier.
- `source`: provider identifier.
- `sourceTrackId` / `youtubeVideoId`: source identifiers.
- `title`, `artist`, `artwork`, `durationMs`.
- `youtubeUrl`: canonical YouTube Music page.
- `localUri`: private app-storage URI for imported local audio.
- `isStreamable`: describes native playback capability, not catalogue availability.

## Playback behavior
- Local audio uses the native audio engine, audio graph effects and local progress.
- YouTube Music results are handed off to the official app or browser.
- External playback is never represented as if LumaMusic controls its transport or progress.
- Queue navigation can open the next selected YouTube Music result, but external completion cannot automatically advance the LumaMusic queue because the external app owns that session.

## Reliability and privacy
- Debounce search and cache results with bounded stale times.
- Handle HTTP errors and empty responses without fabricated catalogue data.
- Do not embed account cookies, passwords, bearer tokens or private credentials.
- Do not download, cache, re-host or redistribute provider audio without authorization.

## Validation gates
1. Discovery parsing and rate-limit handling on Android/iOS.
2. Local playback, queue transitions, sleep timer and audio effects.
3. Physical-device QA for audio focus, interruptions, Bluetooth and background behavior.
4. Release privacy/attribution review and authorized-provider decision before adding streaming.
