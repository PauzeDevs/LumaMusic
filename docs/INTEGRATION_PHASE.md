# LumaMusic Integration Phase

**Status:** YouTube Music catalogue discovery, the authorized stream-resolver client contract, in-app remote playback plumbing and local audio playback are implemented. The provider-authorized resolver backend and dedicated Android Media3 bridge are not included yet.

## Discovery

- Search and discovery use the YouTube Music web client's undocumented InnerTube endpoint.
- Results are normalized into app-owned track, playlist and artist models.
- This is an unofficial, changeable catalogue integration, not a public Google API. LumaMusic is not affiliated with or endorsed by Google or YouTube.

## Playback

- YouTube Music tracks now enter LumaMusic's in-app audio player through `services/authorizedPlayback.ts`.
- Set `EXPO_PUBLIC_YOUTUBE_PLAYBACK_RESOLVER_URL` to an HTTPS resolver that is explicitly authorized to provide playback streams to this app.
- The resolver accepts a POST body containing `provider: "youtube_music"`, `videoId` and `client: "lumamusic-android"`.
- Expected JSON response: `{ "url": "https://...", "mimeType": "audio/*", "expiresAt": "ISO-8601", "headers": {} }`. Only `url` is required; other fields are optional.
- The client validates HTTPS and expiry, loads the returned stream into Expo Audio, and exposes in-app play/pause, live progress, seeking, playback rate, repeat and queue controls.
- The resolver backend is not part of this repository. It must only return streams the operator is authorized and contractually permitted to provide. No undocumented signature-deciphering or access-control bypass is implemented in the app.
- Without a configured resolver, the app reports a clear playback configuration error. It does not fall back to external-app handoff.
- Local audio continues to use the local audio graph and effects.

## Mochy-inspired engineering direction

LumaMusic uses the high-level playback architecture as a reference while retaining its own code, design and identity:

- A dedicated stream-resolution boundary, separate from catalogue search.
- A single in-app player state for progress, transport, queue and repeat.
- Native Android Media3 playback service and MediaSession.
- Background playback, media notification, lock-screen and headset controls.
- Stream expiry recovery and resolver retry handling.

The first two are represented in the current client implementation. The dedicated Media3 service/bridge and expiry recovery are follow-up engineering work. Current remote audio is played through Expo Audio, not yet through a full Media3 service.

## Not yet integrated

- Provider-authorized stream resolver backend and verified authorization for the intended playback use.
- Dedicated Android Media3 playback service and React Native bridge.
- Remote stream expiry recovery and retry policy.
- Physical-device validation for media notification, lock-screen controls, audio focus, Bluetooth and headset buttons.
- Lyrics provider and optional scrobbling integration.
- Cross-device library sync and account sign-in.

## Privacy and rights

The catalogue adapter makes public catalogue requests. The app does not collect Google passwords, cookies or account session tokens. The resolver must not require private account credentials embedded in the mobile client. Local audio remains on-device unless the user shares it through an OS share action.

## QA still required

- Run Expo dependency checks and TypeScript validation.
- Validate resolver success, authorization failure, expired URL, malformed response and network failure.
- Test remote playback, seeking, queue transitions and background playback on a physical Android device.
- Test local playback, interruptions, Bluetooth and headset controls.
- Build and inspect a release APK before marking the integration stable.
