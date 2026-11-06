# LumaMusic UI Phase

**Status:** Initial cross-platform UI prototype committed. Audius discovery and a first audio-engine adapter have since been started; visual components remain provider-agnostic.

## Screens
- Listen / Home
- Search
- Library
- Profile / Settings
- Now Playing

## Shared UI
- Custom bottom navigation with Listen, Search, Library, and You tabs.
- Persistent mini-player above the tab bar.
- Reusable artwork, section heading, and track-row components.
- Dark matte palette with lavender, mint, and soft pink accents.

## Prototype interactions
- Selecting a sample track updates shared Zustand player state.
- Mini-player opens Now Playing.
- Play/pause and next/previous update mock playback state.
- Shuffle and repeat modes update mock queue behaviour.
- Track rows can add/remove local mock favourites.
- Library displays liked sample tracks.
- Search filters the local sample catalogue.
- Playlist creation, local music scanning, device routing, and settings display explicit coming-soon feedback.

## Deliberately not implemented
- Durable favourites, playlists, or listening history.
- User authentication.

## QA gate before integration
- Install dependencies and run the TypeScript check.
- Run Expo dependency compatibility checks.
- Export an Android bundle.
- Inspect on narrow Android and iPhone layouts.
- Verify safe areas, tab navigation, scroll behaviour, artwork fallback, and Now Playing layout.
- Fix compile/runtime issues before starting Audius integration.
