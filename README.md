# LumaMusic

A premium Android and iOS music discovery and listening app by **PauzeDevs**.

## Development order
1. Features and architecture
2. UI/UX using mock data
3. Audius API and playback integration
4. Android/iOS QA and bug fixing
5. Release preparation

## Product direction
- Refined, dark, music-first interface with its own identity.
- Audius is the initial music discovery and streaming source.
- Search, artist and track pages, playlists, favourites, queue management, and listening history.
- Background playback and lock-screen controls are release goals, subject to native audio-engine testing.

## Phase 1 documents
- [Product specification](docs/PRODUCT_SPEC.md)
- [Technical architecture](docs/ARCHITECTURE.md)

## Initial technology direction
- React Native + Expo + TypeScript
- Expo Router
- Audius read-only REST API adapter
- TanStack Query for remote data
- Zustand for client and player state
- AsyncStorage for favourites and listening history; SQLite can be added for larger local libraries
- expo-audio for native playback and background-audio configuration

Initial package versions are pinned in package.json. Dependency compatibility and native audio behaviour must still be validated in Expo development builds, not Expo Go.

## Catalogue and rights
Audius offers a free developer API tier for discovery and eligible streaming. Its catalogue is not equivalent to Spotify or Apple Music and does not guarantee mainstream English, Hindi, or Punjabi hits. Track availability and permitted use can vary. LumaMusic will respect source permissions, attribution requirements, and Audius terms. It will not scrape or extract audio from other streaming services.

## Repository status
The repository contains the feature specification, cross-platform UI, Audius track/artist/playlist discovery, artist and playlist detail screens, initial stream playback, and locally persisted favourites/history. Device testing and a completed CI result are still outstanding. See [UI and integration status](docs/UI_PHASE.md) and [integration notes](docs/INTEGRATION_PHASE.md).
