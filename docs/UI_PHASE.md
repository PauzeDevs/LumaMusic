# LumaMusic UI and Integration Status

**Status:** UI prototype is committed. Initial Audius discovery and audio-engine wiring are in place; device validation is still outstanding.

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

## UI interactions
- Audius trending tracks populate the Listen screen.
- Search uses a debounced Audius track query.
- Selecting an eligible Audius track requests its stream URL and starts the shared player.
- Mini-player opens Now Playing and controls playback.
- Queue, next/previous, shuffle, repeat, seek, and share controls are wired to app/player state.
- Track rows can add/remove favourites in memory.
- Artwork has a fallback when remote images fail.
- Playlist creation, local music scanning, device routing, and account settings still display explicit coming-soon feedback.

## Integration boundaries
- Audius read-only REST API is used for trending and track search.
- The app sends app_name=LumaMusic and does not embed a bearer token.
- expo-audio is configured for background playback and lock-screen metadata.
- Track access flags are checked before playback.
- The catalogue and stream availability remain dependent on Audius and individual track permissions.

## Known gaps
- Favourites and playlists are not persisted across app restarts.
- Artist and playlist search endpoints are not wired yet.
- Queue remote controls on the OS lock screen need a dedicated native-device validation pass.
- Background playback has not yet been tested on physical Android and iOS devices.
- No package-lock file has been generated yet.
- GitHub Actions workflow is present, but no completed CI result has been verified.

## QA gate
- Install dependencies and run the Expo compatibility check.
- Run TypeScript checks.
- Export Android and iOS bundles.
- Inspect narrow Android and iPhone layouts.
- Verify audio stream redirect behaviour, background playback, interruptions, and lock-screen controls.
- Fix compile/runtime issues before release preparation.
