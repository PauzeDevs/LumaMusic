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
- Official Audius JavaScript SDK (@audius/sdk)
- TanStack Query for remote data
- Zustand for client and player state
- SQLite / AsyncStorage for local persistence
- Native audio engine selected after a background-playback proof of concept

Package versions will be checked and pinned when the app scaffold is created. Native audio testing will use Expo development builds, not Expo Go.

## Catalogue and rights
Audius offers a free developer API tier for discovery and eligible streaming. Its catalogue is not equivalent to Spotify or Apple Music and does not guarantee mainstream English, Hindi, or Punjabi hits. Track availability and permitted use can vary. LumaMusic will respect source permissions, attribution requirements, and Audius terms. It will not scrape or extract audio from other streaming services.

## Repository status
The repository is in the planning/specification phase. No working mobile app or playback integration is claimed yet.
