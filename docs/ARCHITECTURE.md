# LumaMusic Technical Architecture

**Status:** YouTube Music discovery migration in progress. Native streaming remains a separate milestone.

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

The app's Expo Audio engine remains available as the native playback abstraction. YouTube Music search results currently have no native stream URL in LumaMusic, so selecting one hands playback to the official YouTube Music app or website. In-app stream extraction, playback synchronization, background streaming and lock-screen control for these tracks are not implemented or claimed.

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

1. **Discovery:** verify track parsing and search on Android/iOS.
2. **Playback:** select an authorized native playback method before wiring stream URLs into Expo Audio.
3. **Audio QA:** validate background, lock-screen, interruption, Bluetooth and queue behavior on physical devices.
4. **Release:** update privacy/attribution disclosures and complete rights review before release.
