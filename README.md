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

### THE CATALOGUE

LumaMusic is an independent, unofficial project and is not affiliated with or endorsed by Google or YouTube. Discovery uses an undocumented public YouTube Music web interface that may change. The app uses an undocumented YouTube Music web interface for discovery and best-effort stream resolution. LumaMusic does not claim official Google authorization. Availability and compatibility can change without notice.

---

<div align="center">
  <sub>AN INDEPENDENT LISTENING SPACE / PAUZEDEVS</sub>
</div>
