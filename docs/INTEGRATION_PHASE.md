# LumaMusic Integration Phase

**Status:** YouTube Music search discovery and official-app handoff are implemented on the feature branch. Native in-app playback remains a separate integration milestone.

## YouTube Music endpoints used
- POST /youtubei/v1/search — Home discovery query.
- POST /youtubei/v1/search — debounced track search.
- Artist pages hand off to the YouTube Music channel page.
- Artist tracklists open on YouTube Music.
- Playlist links open on YouTube Music.
- Playlist tracklists open on YouTube Music.
- Native stream resolution is not enabled; selecting a track opens its YouTube Music page.

Requests include app_name=LumaMusic. No bearer token is embedded in the app. A developer API key may be added later if required for higher request limits.

## Track normalization
The app maps provider responses into the MusicTrack domain type. Provider IDs are namespaced as audius:<id>. The adapter preserves title, artist attribution, artwork, duration, permalink, genre, play count, and streamability flags where supplied.

## Playback flow
1. User selects a result from Home or Search.
2. App opens the track's canonical YouTube Music URL.
3. The official YouTube Music client or website handles playback.
4. Native in-app streaming is not part of this phase.
5. App sets lock-screen metadata and updates shared Zustand playback state.
6. Mini-player and Now Playing read from the same state.

## Current integration scope
- Home trending tracks and playlists.
- Debounced track, artist, and playlist search.
- Artist profile and playlist detail screens.
- Stream URL resolution.
- Shared audio player.
- Background playback configuration.
- Lock-screen metadata.
- Play/pause, next/previous, shuffle, repeat, seek, and share controls in the app UI.
- Persisted liked tracks and recently played history using local device storage.

## Not yet integrated
- Artist and playlist pagination beyond the first page.
- User-created playlist management and full listening-history controls.
- YouTube Music OAuth and account-linked write actions.
- Local-device music scanning.
- Remote next/previous lock-screen queue actions.
- Offline downloads.
- Any mainstream label catalogue beyond what artists have made available through YouTube Music.

## Rights and catalogue limits
YouTube Music is a discovery and streaming source, not a guarantee of the full Spotify/Apple Music catalogue. A track may be unavailable, gated, removed, or not streamable. LumaMusic must respect each track's access state and the YouTube Music terms. The app does not scrape, extract, re-host, or download tracks from other streaming services.

## QA still required
- Confirm live API responses on device and handle schema differences.
- Confirm stream redirects and supported audio formats on Android and iOS.
- Confirm background playback and lock-screen play/pause.
- Test calls, audio interruptions, headphones, Bluetooth disconnection, and network loss.
- Run Expo dependency checks, TypeScript, and Android/iOS exports.
- Validate AsyncStorage persistence and migrations on physical Android and iOS devices.
