# LumaMusic Integration Phase

**Status:** YouTube Music catalogue discovery and external playback handoff are implemented on `feat/youtube-music-provider`. Native in-app audio streaming is not implemented in this phase.

## Discovery

- Search uses the YouTube Music web client's InnerTube `search` endpoint.
- The app maps track title, artist text, artwork, duration and video ID into the app-owned `MusicTrack` type.
- Home discovery currently runs a curated `new music` query.
- Featured playlist discovery uses a playlist-filtered search query.
- Search results are cached by TanStack Query.
- The integration is unofficial and undocumented. It is not a Google/YouTube public API and LumaMusic does not claim Google authorization or affiliation.

## Playback handoff

1. The user selects a search or discovery result.
2. LumaMusic opens the canonical `music.youtube.com/watch?v=<videoId>` URL.
3. YouTube Music or the browser handles playback.
4. LumaMusic records the selection in its local recently played list.

The Expo Audio player remains in the project for the native playback layer, but YouTube Music tracks do not currently supply a native audio URL to it. In-app playback, seek synchronization, lock-screen controls for YouTube Music streams, background streaming and queue continuity are therefore not claimed as complete.

## Data model

YouTube Music tracks use namespaced IDs (`youtube:<videoId>`) and retain a canonical YouTube Music URL. The legacy `audius` source literal remains in the type temporarily so previously persisted library entries can be read safely; the Audius service and API requests have been removed from the active app code.

## Not yet integrated

- Native audio stream resolution through a permitted playback interface.
- In-app play/pause, seek, next/previous and queue synchronization for YouTube Music audio.
- Background audio and lock-screen controls for YouTube Music tracks.
- Google account sign-in, library sync, likes, subscriptions or write actions.
- Full artist/album/playlist detail parsing and pagination.
- Local-device music scanning and offline downloads.

## Privacy and rights

The current discovery adapter does not collect Google passwords, cookies or account session tokens. It makes public web requests to YouTube Music and opens canonical track pages for playback. Google/YouTube may receive normal network metadata such as IP address and request information.

Do not describe this unofficial integration as officially approved by Google. Any future native playback implementation must use a method that is authorized for the intended use, respect access controls and applicable terms, and avoid storing or redistributing audio without permission.

## QA still required

- Validate live search response parsing on Android and iOS.
- Verify empty, rate-limited, unavailable and changed-response cases.
- Test opening YouTube Music links when the app is installed and when it is not.
- Run Expo dependency checks, TypeScript and Android/iOS development builds.
- Validate local library migration for older persisted Audius entries.
