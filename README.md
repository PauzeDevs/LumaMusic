<div align="center">
  <img src="assets/lumamusic-soundstage.svg" alt="LumaMusic soundstage artwork" width="100%" />
</div>

<div align="center">
  <h3>Less noise. More music.</h3>
  <a href="https://github.com/PauzeDevs/LumaMusic/actions/workflows/ci.yml"><img src="https://github.com/PauzeDevs/LumaMusic/actions/workflows/ci.yml/badge.svg?branch=main" alt="LumaMusic CI status" /></a>
  <p>A music discovery experience built by <a href="https://github.com/PauzeDevs">PauzeDevs</a>.</p>
  <p><a href="https://LumaMusic.devs.surf">Visit the LumaMusic website ↗</a></p>
</div>

---

### THE EXPERIENCE

Discover YouTube Music catalogue entries, play supported streams in the app, and keep a personal library that feels like yours.

- **Discover** tracks through YouTube Music search.
- **Listen** with LumaMusic’s native audio player when a compatible stream is available.
- **Keep close** your favourites and recently opened tracks.
- **Organise** local playlists and your listening history.
- **Refresh** with LumaMusic's own animated pull-to-refresh treatment.

### UNDER THE HOOD

React Native · Expo · TypeScript · Expo Router · YouTube Music web search · TanStack Query · Zustand · AsyncStorage · expo-audio

### START THE APP

```bash
npm install
npx expo start
```

Use an Expo development build when testing native audio. The app resolves available audio streams and plays them through Expo Audio. Stream availability depends on YouTube’s undocumented, changeable web interface and compatible formats. Playback recovery, background audio, lock-screen controls and queue continuity must be validated on physical devices before a production release.

### PROJECT FILES

| Document | |
|---|---|
| Product direction | [Product specification](docs/PRODUCT_SPEC.md) |
| Architecture | [Technical architecture](docs/ARCHITECTURE.md) |
| Interface progress | [UI and integration status](docs/UI_PHASE.md) |
| API and playback | [Integration notes](docs/INTEGRATION_PHASE.md) |


### GOOGLE DRIVE ACCOUNT SETUP

LumaMusic can back up library metadata to the user's private Google Drive `appDataFolder`. It requests only the non-sensitive `drive.appdata` scope; it does not browse normal Drive files or upload audio.

Before Google sign-in can work in a native build:

1. Create a Google Cloud project and enable the Google Drive API.
2. Configure the OAuth consent screen and add the `drive.appdata` scope.
3. Create Android and iOS OAuth client IDs for package/bundle ID `dev.pauze.lumamusic`. Add the Android SHA-1 fingerprints for each signing certificate used by development and production builds.
4. Replace the placeholder `iosUrlScheme` in `app.json` with the reversed iOS client ID (the `com.googleusercontent.apps...` value).
5. Rebuild the native app. Google Sign-In uses native code and does not run in Expo Go.

The Account screen currently supports connecting, first-time restore-or-keep choice, manual backup, and disconnect. Automatic background sync and robust multi-device conflict merging are not enabled yet. The local library remains available when offline.

### THE CATALOGUE

LumaMusic is an independent, unofficial project and is not affiliated with or endorsed by Google or YouTube. Discovery uses an undocumented public YouTube Music web interface that may change. The app uses an undocumented YouTube Music web interface for discovery and best-effort stream resolution. LumaMusic does not claim official Google authorization. Availability and compatibility can change without notice.

---

<div align="center">
  <sub>AN INDEPENDENT LISTENING SPACE / PAUZEDEVS</sub>
</div>
