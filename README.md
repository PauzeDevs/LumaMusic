<!-- LumaMusic README | custom animated soundstage -->
<div align="center">
  <img src="assets/lumamusic-soundstage.svg" alt="LumaMusic animated soundstage" width="100%" />
  <br />
  <p><strong>A quieter interface. A louder connection.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-8B7CF6?style=flat-square" alt="Android and iOS" />
    <img src="https://img.shields.io/badge/stack-React%20Native%20%2B%20Expo-38CFC0?style=flat-square" alt="React Native and Expo" />
    <img src="https://img.shields.io/badge/language-TypeScript-6C8EFF?style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/catalogue-Audius-9B83FF?style=flat-square" alt="Audius" />
  </p>
  <p>
    <a href="#-what-is-lumamusic">Explore</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-technology">Technology</a> ·
    <a href="#-run-locally">Run locally</a>
  </p>
</div>

---

## 🎧 What is LumaMusic?

**LumaMusic** is a cross-platform music discovery and listening app by **PauzeDevs**. It pairs a focused, music-first interface with discovery powered by the Audius catalogue.

The goal is simple: make finding something worth listening to feel effortless, then get out of the way.

## ✦ Features

- **Discover** tracks, artists and playlists through Audius.
- **Search** the catalogue and explore artist and playlist detail pages.
- **Listen** with an in-app player and queue controls.
- **Your library** with locally persisted favourites and listening history.
- **Siri-inspired pull-to-refresh animation** across the main tabs, with a custom Luma assistant visual.
- **Dark, music-first UI** designed for a calm listening experience.

## 🧩 Technology

| Layer | Stack |
|---|---|
| App | React Native, Expo, TypeScript |
| Navigation | Expo Router |
| Catalogue | Audius public REST API |
| Server state | TanStack Query |
| Local state | Zustand |
| Persistence | AsyncStorage |
| Audio | expo-audio |

## 🚀 Run locally

```bash
npm install
npx expo start
```

Use an Expo development build for native audio testing. Expo Go is not a substitute for validating native playback and background-audio behaviour.

## 📁 Project notes

- [Product specification](docs/PRODUCT_SPEC.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [UI and integration status](docs/UI_PHASE.md)
- [Integration notes](docs/INTEGRATION_PHASE.md)

## 🎼 Catalogue and rights

Audius is the initial discovery and streaming source. Its catalogue is not equivalent to Spotify or Apple Music, and it does not guarantee mainstream English, Hindi or Punjabi releases. Track availability and permitted use can vary. LumaMusic respects source permissions, attribution requirements and Audius terms. It does not scrape or extract audio from other streaming services.

## 🛠️ Project status

The app's core discovery, library and playback flows are implemented, and the latest GitHub Actions build completed successfully for Android and JavaScript bundles. Physical-device QA, especially playback behaviour across device states, remains part of release validation.

---

<div align="center">
  <sub>Designed with care by <a href="https://github.com/PauzeDevs">PauzeDevs</a> · LumaMusic</sub>
</div>
