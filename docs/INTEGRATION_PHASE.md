# LumaMusic Integration Phase

**Status:** Catalogue discovery and best-effort native in-app audio playback are present. Stream availability and playback reliability require ongoing physical-device validation.

## Discovery

- Search uses the YouTube Music web client's InnerTube `search` endpoint.
- The app maps track title, artist text, artwork, duration and video ID into the app-owned `MusicTrack` type.
- Home discovery currently runs a curated `new music` query.
- Featured playlist discovery uses a playlist-filtered search query.
- Search results are cached by TanStack Query.
- The integration is unofficial and undocumented. It is not a Google/YouTube public API and LumaMusic does not claim Google authorization or affiliation.

## Native playback

1. The user selects a catalogue result.
2. The app resolves an available audio format for the selected track.
3. The native audio player handles playback, progress, seeking and transport controls.
4. LumaMusic records the selection in the local recently played list.

The resolver is best-effort and depends on undocumented provider interfaces and direct media URLs. Some tracks and formats may be unavailable, URLs can expire or be rejected, and stream availability can change. The app retries one failed external stream automatically; persistent failures still surface to the user. Background playback, lock-screen controls and queue continuity require physical-device validation.

## Data model

YouTube Music tracks use namespaced IDs (`youtube:<videoId>`) and retain a canonical YouTube Music URL. The legacy `audius` source literal remains in the type temporarily so previously persisted library entries can be read safely; the Audius service and API requests have been removed from the active app code.

## Not yet integrated

- Reliable stream resolution across all catalogue entries and regions.
- Exhaustive physical-device validation of background audio, lock-screen controls, interruptions and queue recovery.
- Google account sign-in, library sync, likes, subscriptions or write actions.
- Full artist/album/playlist detail parsing and pagination.
- Local-device music scanning and offline downloads.

## Privacy and rights

The discovery adapter does not collect Google passwords, cookies or account session tokens. It makes public catalogue requests and may receive normal network metadata such as IP address and request information.

Do not describe this unofficial integration as officially approved by Google. Any future native playback implementation must use a method that is authorized for the intended use, respect access controls and applicable terms, and avoid storing or redistributing audio without permission.

## QA still required

- Validate live search response parsing on Android and iOS.
- Verify empty, rate-limited, unavailable and changed-response cases.
- Test opening YouTube Music links when the app is installed and when it is not.
- Run Expo dependency checks, TypeScript and Android/iOS development builds.
- Validate local library migration for older persisted Audius entries.
