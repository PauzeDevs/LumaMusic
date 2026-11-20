# LumaMusic product roadmap

Reviewed 18 November 2026 against the public Mochy Music site and wiki and the current `master` source tree. This is a product gap assessment, not a promise that every provider or format will be available on every platform.

## Current product snapshot

LumaMusic already has a home/discovery screen, YouTube Music search and playback, a local-file library, playlists and queue management, playlist import/matching, lyrics, listening statistics, an Audio Lab, and appearance settings. It supports several player styles and custom accent/surface settings. Playback capabilities vary by source; in particular, the Audio Lab currently identifies some effects as unavailable during YouTube Music streaming.

Mochy publicly highlights playlist imports from Spotify, YouTube Music, Apple Music, and Tidal; multiple player styles and custom modules; word-synced lyrics; audio effects and crossfade; listening recaps; data saver; and search that can navigate directly to settings. Its wiki also documents an offline library with downloads and cached items, provider ordering, and a module system for sources, looks, players, lyrics, and song metadata.

## Gap comparison

| Area | LumaMusic today | Mochy publicly documents | LumaMusic opportunity |
| --- | --- | --- | --- |
| Playback | YouTube Music streams and local files; native Android player | YouTube Music plus ordered provider modules and downloads | Stabilize startup, playback, queue transitions, and background behavior before adding more sources |
| Library | Local files, saved tracks/playlists, playlist import and matching | Local, cached, imported, and downloaded tracks; imports from four services | Add durable offline downloads and clear storage controls |
| Data use | No user-facing data saver found in current preferences | Lower data streams and still artwork on mobile data | Add a data saver preference with observable quality and artwork behavior |
| Audio | Equalizer, reverb, balance, playback settings; stream support varies | Equalizer, effects, crossfade, and quality/provider ordering | Make source capability clear and add crossfade after reliability work |
| Lyrics | Lyrics screen and lyrics service | Multiple sources, word timing, source selection, timing adjustment, translation, video sync | Improve timing/source selection and gracefully handle unavailable lyrics |
| Personalization | Three player styles, accent/surface/motion controls, modules page | Many built-in styles and a public module system | Expand built-in customization first; define a safe extension format only after a threat model |
| Discovery | Search, featured content, artists, playlists, tracks | Search for moods, genres, songs, albums, artists, playlists, and videos | Improve search filters, pagination, and empty/error states |
| Listening history | Monthly/yearly stats and top listening information | Stats plus story-style monthly/yearly recap | Add a shareable recap that stays private unless the listener chooses to export |
| Settings | Categorized settings pages | Search across settings and jump to a specific control | Add settings search and deep links |

## Suggested delivery order

### 0. Playback reliability

- Verify the main-thread ExoPlayer initialization fix on a freshly built Android app.
- Cover startup, load, play, pause, seek, release, background/foreground, and repeated app launches.
- Keep crash logs tied to the exact app build/commit.

### 1. Offline-ready library

- Add downloads for sources that permit them, with explicit source/rights constraints.
- Track download state, progress, failures, and available storage.
- Add a downloaded filter, remove-download action, and safe cleanup behavior.
- Preserve imported playlists even when a track cannot be matched or downloaded.

### 2. Data saver and quality controls

- Add a persistent data saver setting, including an optional mobile-data-only mode.
- Select a lower-bandwidth stream only when the active source exposes a valid alternative.
- Avoid fetching large artwork on mobile data when data saver is active.
- Show the selected/known quality honestly; never claim lossless without verified metadata.

### 3. Findability and playback polish

- Search settings and navigate to the matching setting page.
- Add crossfade only where the active playback path supports gapless overlap.
- Improve lyric source choice and timed-lyrics behavior, with clear fallbacks.
- Make queue, repeat, shuffle, and background playback states consistent.

### 4. Imports and discovery

- Keep playlist import modular: parse an export or link, match tracks, preview matches, and let the listener decide what to add.
- Evaluate Spotify, Apple Music, and Tidal imports one provider at a time; do not imply those services provide playable audio.
- Improve search filters and pagination for tracks, albums, artists, and playlists.

### 5. Personalization and recap

- Expand built-in player/appearance choices and make unsupported options clear.
- Add an opt-in recap built from local listening history, with explicit export/share controls.
- Consider a declarative module format only after defining validation, permissions, update, and removal guarantees.

## Principles

- Reliability and honest capability reporting come before feature count.
- Keep listening history and account data local by default.
- Make provider availability, data use, downloads, and format claims explicit.
- Ship features in small increments with a visible success/error state and a recovery path.

## References

- [Mochy Music feature overview](https://realidkroo.github.io/Mochy-Music/)
- [Mochy Music app guide](https://realidkroo.github.io/Mochy-Music/wiki/)
