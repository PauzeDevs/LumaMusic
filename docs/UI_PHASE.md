# LumaMusic UI and Integration Status

**Current state:** Catalogue discovery, native audio playback controls and the core library experience are implemented. Track availability and background behaviour still require device testing.

## Screens
- Listen / Home
- Search
- Library
- Profile
- Now Playing
- Queue
- Lyrics
- Artist handoff
- Playlist handoff

## Shared interface
- Dark matte palette with restrained lavender and mint accents.
- Translucent glass-inspired surfaces and custom bottom navigation.
- Persistent mini-player above the tab bar when a track has been selected.
- Reusable artwork, section heading, artist, playlist and track rows.
- Scroll reveal and animated refresh treatment.

## Implemented interactions
- Home loads a YouTube Music discovery query and featured playlist results.
- Search supports track, artist and playlist filters. The All filter combines all three result types.
- Artist and playlist rows open their canonical YouTube Music pages.
- Selecting a track records it in the local recent history, updates shared player metadata and opens its canonical YouTube Music page.
- The mini-player and Now Playing screen show the selected track and identify YouTube Music as the playback destination.
- Queue rows can be reordered, removed and opened. Next/previous actions hand off the selected queue track to YouTube Music.
- Track rows can add or remove local favourites.
- Liked tracks, recent selections and locally created playlists persist with AsyncStorage.
- Missing or failed artwork uses the app's neutral music-note fallback rather than fabricated catalogue artwork.

## Playback boundary
- YouTube Music playback is handled by the official YouTube Music app or website after handoff.
- LumaMusic does not currently receive live playback position, duration progress, play/pause state or audio-session events from YouTube Music.
- LumaMusic therefore does not display a fake progress bar or claim that its own play/pause, seek, playback-rate or sleep-timer controls control external playback.
- Native in-app streaming, synchronized background playback, lock-screen controls and live playback timing remain future work pending an authorized playback route.
- The Expo Audio engine remains the native playback abstraction for a future supported source.

## Known future work
- Native in-app audio playback through a permitted playback interface.
- Live progress, seek synchronization, background controls and lock-screen metadata.
- Licensed lyrics provider configuration and synced-lyrics validation.
- Full artist/album/playlist metadata, tracklists and pagination.
- Add/remove tracks in local playlists and local-device music scanning.
- Connect settings and account actions to real functionality.
- Validate small-screen layouts and accessibility on physical Android and iOS devices.

## QA checklist
- Expo dependency compatibility check.
- TypeScript check.
- Android and iOS JavaScript bundle exports.
- Android native prebuild and release APK build.
- Live YouTube Music response parsing, empty results and request failures.
- Installed-app and browser fallback for track, artist and playlist links.
- Artwork loading and fallback behaviour.
- Queue, favourites and recent history persistence after force-close/relaunch.
- Physical-device UI, audio interruption and navigation testing.
