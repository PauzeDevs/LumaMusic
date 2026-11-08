# LumaMusic Product Specification

**Status:** Phase 1 baseline  
**Owner:** PauzeDevs  
**Platforms:** Android and iOS  
**Initial music source:** YouTube Music

## Product vision
LumaMusic is a modern music discovery and listening app with a refined, editorial interface. It should feel fast, calm, personal, and music-first. The first release must accurately represent the music available from connected sources; it must not imply that YouTube Music contains every mainstream or charting release.

## Product principles
1. Playback reliability first.
2. Honest catalogue presentation and track-level availability.
3. Fast discovery with designed loading, empty, and error states.
4. Personal library with clear separation between local app actions and YouTube Music account actions.
5. Native behaviour for audio focus, interruptions, background playback, headset controls, and lock-screen controls.
6. Accessibility: readable contrast, scalable text, screen readers, and comfortable touch targets.

## Navigation
Primary bottom navigation:
- **Home:** discovery, trending, new and recommended music.
- **Search:** search tracks, artists, and playlists.
- **Library:** liked tracks, saved playlists, recently played, and local music entry point.
- **Profile:** account, preferences, connected services, and settings.

Persistent player:
- Mini-player above the tab bar when a track is active.
- Tap to open the full Now Playing screen.
- Queue accessible from Now Playing.

Secondary destinations: track details, artist profile, playlist details, album/collection details where supported, queue, settings, and YouTube Music attribution information.

## MVP features

### Home and discovery
- Trending tracks from YouTube Music.
- New releases / recently added tracks where supported.
- Curated sections based on available YouTube Music data.
- Artwork, title, and artist shelves.
- Pull-to-refresh and pagination where useful.
- Loading skeletons, empty states, and retry states.

### Search
- Search tracks and artists initially; playlists where supported.
- Debounced requests and pagination.
- Locally stored search history with a clear-history action.
- Result rows show artwork, title, artist, and source.
- Never fabricate results when the source returns none.

### Playback
- Play and pause.
- Seek when supported.
- Previous and next.
- Shuffle and repeat.
- Queue view with add, remove, and reorder.
- Playback persists while navigating.
- Handle unavailable, restricted, deleted, and failed streams gracefully.
- Display source attribution and artist information.

### Library
- Like / unlike tracks locally in MVP.
- Create, rename, and delete local playlists.
- Add and remove tracks from playlists.
- Recently played history.
- Persist library data across app restarts.
- Keep local favourites distinct from actions on an authenticated YouTube Music account.

### Artist and collection pages
- Artist profile and available tracks.
- Artist artwork / avatar and metadata.
- Track lists with play actions.
- Collection or playlist pages where supported.
- Follow, repost, and other YouTube Music account actions are not MVP requirements.

### Settings
- Dark theme first; system theme may be added.
- Audio quality preference only if the source and player expose meaningful options.
- Clear listening history and search history.
- About, attribution, privacy, and open-source notices.
- Diagnostics useful for bug reports.

### Native audio behaviour
Release target: background playback, lock-screen metadata and controls, headset/Bluetooth controls, audio focus and interruption handling, and correct behaviour around calls and alarms. These are acceptance requirements, not claims that they are already implemented. The audio engine will be selected after a native proof of concept.

## Later features
- User accounts and cloud sync.
- Personalized recommendations.
- Lyrics only from a source with appropriate rights and API access.
- Artist submissions or uploads.
- Additional licensed catalogue providers.
- Cross-device playback sync.
- Offline downloads only where explicitly permitted.
- Social sharing and collaborative playlists.

## Explicit non-goals
The first release will not claim the full Spotify, Apple Music, or YouTube Music catalogue; scrape or extract audio from those services; bypass subscriptions, ads, DRM, geographic restrictions, or playback controls; download/cache tracks without permission; re-host third-party music files; or promise lyrics, lossless audio, or a bitrate without verified support.

## Core user journeys

### Discover and play
1. User opens Home.
2. App loads discovery sections.
3. User selects a track.
4. App checks availability and requests the permitted stream.
5. Playback starts and mini-player appears.
6. User opens Now Playing and manages the queue.

### Search and play
1. User enters a query.
2. Search is debounced.
3. Track / artist results appear with loading and error states.
4. User selects a playable track.
5. Playback begins and queue state updates according to defined queue rules.

### Save a favourite
1. User taps like.
2. Local library updates immediately.
3. The change persists locally.
4. YouTube Music account sync, if added later, requires explicit OAuth authorization.

## MVP acceptance criteria
- App launches offline and shows a useful offline state.
- Home and Search distinguish loading, empty, error, and populated states.
- Search returns real YouTube Music results and handles pagination.
- A permitted track can start, pause, seek when supported, and stop.
- Queue state remains consistent while navigating.
- Favourites and local playlists persist after force-close and relaunch.
- Unavailable or restricted tracks show a useful message rather than crashing.
- Background and lock-screen behaviour passes device testing before being marked complete.
- No bearer tokens or private secrets are embedded in the client bundle.
- YouTube Music attribution and required source links are visible where applicable.

## First-test success measures
- No crash in browse → search → play → queue.
- Search is responsive and does not request on every keystroke.
- Player state stays synchronized across mini-player, Now Playing, and OS media controls.
- Library data survives app restarts.
- Errors are recoverable and explain the next action.
