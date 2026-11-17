# LumaMusic Technical Architecture

**Status:** YouTube Music discovery and best-effort in-app stream playback are implemented; reliability and device QA remain active work.

## Architecture overview

LumaMusic uses a TypeScript React Native client built with Expo.

- Expo Router renders the app screens.
- TanStack Query owns remote discovery data and caching.
- Zustand owns player and library state.
- AsyncStorage persists favourites, local playlists and recent selections.
- `services/youtubeMusic.ts` isolates YouTube Music catalogue discovery.
- `AudioPlayerProvider` remains the app-level audio-engine boundary.

## Current source integration

The current provider sends public search requests to YouTube Music's undocumented InnerTube web endpoint. It normalizes track title, artist, artwork, duration and video ID into app-owned models. Search results are opened using their canonical YouTube Music URL.

This is an unofficial integration. YouTube Music does not publish this endpoint as a supported third-party API. LumaMusic is not affiliated with or endorsed by Google or YouTube and does not claim official authorization.

## Playback boundary

`AudioPlayerProvider` owns the native Expo Audio player, queue transitions, local-file playback, playback status, seeking and bounded stream recovery. `youtubePlayback.ts` resolves direct audio formats through several InnerTube client profiles and uses the Android NewPipe module as a fallback. Stream URLs are cached in memory only until their expiry window. This resolver is unofficial and best-effort: a successful metadata response does not guarantee that the media URL will play.

Any future native playback provider must use a playback method authorized for the intended use, respect access controls and provider terms, and avoid unauthorized downloading, caching, re-hosting or redistribution.

## Domain models

### Track
- `id`: stable source-namespaced ID, e.g. `youtube:<videoId>`
- `source`: provider identifier
- `sourceTrackId` / `youtubeVideoId`
- `title`, `artist`, `artwork`, `durationMs`
- `youtubeUrl`: canonical YouTube Music page
- `isStreamable`: false until a supported native playback route exists

### Library
- Liked tracks, recently opened tracks and user-created playlists are stored locally.
- The legacy Audius source literal is retained temporarily for compatibility with previously persisted library entries. No active Audius service calls remain.

## Network and failure handling

- Debounce search input.
- Cache search results with bounded stale times.
- Handle HTTP errors and empty responses without fabricated catalogue data.
- Treat the web endpoint as changeable and undocumented.
- Do not embed account cookies, passwords, bearer tokens or private credentials.

## Validation gates

1. **Discovery:** verify track parsing, search errors, rate limits and response changes on Android/iOS.
2. **Playback:** validate resolver responses, stream expiry, retries and format compatibility.
3. **Audio QA:** validate background, lock-screen, interruptions, Bluetooth, seeking and queue behaviour on physical devices.
4. **Release:** review provider terms, privacy/attribution disclosures and distribution rights before release.
