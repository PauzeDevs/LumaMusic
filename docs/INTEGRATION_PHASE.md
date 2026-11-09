# LumaMusic Integration Phase

**Status:** YouTube Music catalogue discovery and official-app handoff are implemented. Native in-app playback is supported for user-imported local audio.

## Discovery
- Search and discovery use the YouTube Music web client's undocumented InnerTube endpoint.
- The app maps title, artist, artwork, duration and video ID into the app-owned MusicTrack type.
- This is an unofficial, changeable discovery integration, not a public Google API. LumaMusic is not affiliated with or endorsed by Google or YouTube.

## Playback
- YouTube Music results open their canonical YouTube Music URL in the official app or browser.
- LumaMusic does not extract, proxy, cache, download or redistribute YouTube audio.
- Local audio imported by the user is played inside LumaMusic through the native audio engine.
- Queue, seek, playback rate, sleep timer and audio effects apply to local playback. External playback controls and progress remain owned by YouTube Music.

## Product direction inspired by Mochy Music
LumaMusic takes high-level inspiration from Mochy's focused Android listening experience, feature depth and user-respecting approach. It retains its own visual identity, code, architecture and interaction design:
- Velvet-red, dark-matte visual language with restrained glass surfaces.
- A focused now-playing screen with large artwork and clear transport controls.
- Local-first library, favourites, playlists and queue.
- Honest source labels and no fabricated playback progress.
- No account requirement for local listening.

No Mochy source code, assets, branding or layouts are copied.

## Not yet integrated
- Authorized native streaming provider.
- Android media notification, lock-screen controls and media-session integration for LumaMusic local audio.
- Audio focus, Bluetooth and headset-button QA on physical devices.
- Lyrics provider and optional scrobbling integration.
- Artist/album/playlist detail parsing and pagination.
- Cross-device library sync and account sign-in.

## Privacy and rights
The discovery adapter makes public catalogue requests and opens canonical provider links. It does not collect Google passwords, cookies or account session tokens. Local audio remains on the device unless the user shares it through an OS share action. Users remain responsible for having rights to audio they import.

## QA still required
- Validate live search parsing on Android and iOS.
- Verify empty, rate-limited, unavailable and changed-response cases.
- Test official-app handoff with and without YouTube Music installed.
- Test local playback, seeking, queue transitions, interruptions and background behavior on physical Android devices.
- Run Expo dependency checks, TypeScript and Android/iOS development builds before release.
