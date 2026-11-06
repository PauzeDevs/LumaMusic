# LumaMusic Integration Phase

**Status:** Initial Audius discovery and single-track playback wiring committed. Physical-device and build validation remain outstanding.

## Audius endpoints used
- GET /v1/tracks/trending — Home discovery.
- GET /v1/tracks/search — debounced track search.
- GET /v1/tracks/{track_id}/stream — source stream endpoint for eligible tracks.

Requests include app_name=LumaMusic. No bearer token is embedded in the app. A developer API key may be added later if required for higher request limits.

## Track normalization
The app maps provider responses into the MusicTrack domain type. Provider IDs are namespaced as audius:<id>. The adapter preserves title, artist attribution, artwork, duration, permalink, genre, play count, and streamability flags where supplied.

## Playback flow
1. User selects a result from Home or Search.
2. App verifies the normalized track is streamable and has a source ID.
3. App creates the Audius stream endpoint URL.
4. expo-audio loads the remote stream.
5. App sets lock-screen metadata and updates shared Zustand playback state.
6. Mini-player and Now Playing read from the same state.

## Current integration scope
- Home trending feed.
- Debounced track search.
- Stream URL resolution.
- Shared audio player.
- Background playback configuration.
- Lock-screen metadata.
- Play/pause, next/previous, shuffle, repeat, seek, and share controls in the app UI.
- In-memory liked tracks.

## Not yet integrated
- Artist search and artist detail API.
- Playlist search and playlist playback.
- Durable favourites, playlists, and history.
- Audius OAuth and account-linked write actions.
- Local-device music scanning.
- Remote next/previous lock-screen queue actions.
- Offline downloads.
- Any mainstream label catalogue beyond what artists have made available through Audius.

## Rights and catalogue limits
Audius is a discovery and streaming source, not a guarantee of the full Spotify/Apple Music catalogue. A track may be unavailable, gated, removed, or not streamable. LumaMusic must respect each track's access state and the Audius terms. The app does not scrape, extract, re-host, or download tracks from other streaming services.

## QA still required
- Confirm live API responses on device and handle schema differences.
- Confirm stream redirects and supported audio formats on Android and iOS.
- Confirm background playback and lock-screen play/pause.
- Test calls, audio interruptions, headphones, Bluetooth disconnection, and network loss.
- Run Expo dependency checks, TypeScript, and Android/iOS exports.
- Persist the library only after choosing and validating the storage migration approach.
