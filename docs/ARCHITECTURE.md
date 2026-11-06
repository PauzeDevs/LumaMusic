# LumaMusic Technical Architecture

**Status:** Phase 1 baseline. Implementation details are validated during scaffolding and technical spikes.

## Architecture overview
LumaMusic uses a TypeScript React Native client. Audius is the first remote music source. Provider-specific logic stays behind a music-source adapter so additional licensed providers can be added without rewriting screens or the player UI.

Data flow:
- Expo Router renders screens and reusable components.
- Application/domain layer owns search, library, queue, and playback use cases.
- TanStack Query owns remote data and caching.
- Zustand owns transient player and UI state.
- MusicSource adapter talks to Audius.
- AudioEngine adapter talks to the selected native audio library.
- SQLite / AsyncStorage persist local library and preferences.

## Proposed stack

| Concern | Initial choice | Notes |
|---|---|---|
| Mobile app | React Native + Expo | Android and iOS |
| Language | TypeScript | Strict mode |
| Navigation | Expo Router | File-based routes |
| Audius integration | @audius/sdk | Official TypeScript SDK |
| Server-state cache | TanStack Query | Search, trending, artist and playlist data |
| Client/player state | Zustand | Queue, playback UI, preferences |
| Persistence | expo-sqlite + AsyncStorage | Structured library/history and small preferences |
| Audio | Native audio-engine adapter | Choose after background playback proof of concept |
| Testing | Jest/Vitest-compatible setup + React Native Testing Library | Pin compatible versions at scaffold time |
| Builds | EAS Build / Expo development builds | Native modules require development builds |

Package versions must be checked for compatibility and pinned when the scaffold is created. Expo Go is not the target runtime for native audio testing.

## Music-source adapter
Screens and domain logic must not call Audius endpoints directly.

Conceptual interface:

    export interface MusicSource {
      searchTracks(query: string, page?: number): Promise<TrackPage>;
      searchArtists(query: string, page?: number): Promise<ArtistPage>;
      getTrendingTracks(options?: BrowseOptions): Promise<TrackPage>;
      getArtistTracks(artistId: string, page?: number): Promise<TrackPage>;
      getPlaylist(playlistId: string): Promise<Playlist>;
      getPlaylistTracks(playlistId: string, page?: number): Promise<TrackPage>;
      getPlayableStream(track: Track): Promise<PlayableStream>;
    }

The Audius adapter will:
- Use the official @audius/sdk package.
- Normalize raw Audius responses into app-owned domain types.
- Preserve source IDs, canonical URLs, artwork, artist attribution, duration, and availability flags.
- Treat stream URLs as source-controlled values; do not persist them as permanent track identifiers.
- Surface provider errors in typed form.
- Respect track access controls and source terms.

## Domain models

### Track
- id: stable app identifier namespaced by source, e.g. audius:<source-id>
- source: provider identifier
- sourceTrackId: provider track ID
- title
- artistId / artistName
- artworkUrl
- durationMs (nullable)
- canonicalUrl
- isPlayable
- availabilityReason (optional)
- explicit (only if source provides reliable metadata)

### Artist
- id, source, sourceArtistId, name, artworkUrl, canonicalUrl, bio (optional).

### Playlist
- id, name, description, artworkUrl, trackIds, createdAt, updatedAt, isLocal.

### QueueItem
- queueId (unique per queue entry)
- trackId
- addedAt
- optional source context (search, playlist, artist, etc.).

## State ownership
- TanStack Query owns remote server state and request caching.
- Zustand owns transient playback state: current item, queue, current index, shuffle, repeat, player visibility, and playback status.
- SQLite owns durable local data: playlists, favourites, play history, and structured preferences.
- AsyncStorage is reserved for small non-sensitive settings and SDK-required persistence.
- Do not duplicate authoritative state across stores.

## Audio engine decision
The audio engine remains an architecture decision pending a proof of concept.

Candidates:
- react-native-track-player
- Expo supported audio module(s)

The proof of concept must demonstrate on real Android and iOS devices:
1. Background playback after app is backgrounded.
2. Lock-screen / notification metadata and controls.
3. Play, pause, seek, next, and previous.
4. Audio focus and interruption handling.
5. Bluetooth / headset controls.
6. Queue continuity and recovery from stream errors.
7. Compatibility with the chosen Expo SDK and development-build workflow.

Do not build the full player UI around a library until this test passes.

## Audius API and credential handling
Current official Audius documentation describes:
- Free API plan: 10 requests/second and 500,000 requests/month.
- API key may be used in client-side contexts.
- Bearer token must never be embedded in a browser or mobile client.
- OAuth 2.0 Authorization Code with PKCE for user-authorized actions.

Implementation rules:
- Use public/read-only SDK features for discovery initially.
- Register the app name and API key through Audius developer settings.
- Never place an app bearer token, client secret, or private key in the mobile bundle.
- Use Audius OAuth PKCE only if account-linked actions are added.
- Do not request write scope for the read-only MVP.
- Handle rate limits, timeouts, retries, and provider errors.
- Cache appropriate read-only results with bounded stale times.
- Do not assume every Audius track is playable in every context.

Official references:
- API reference: https://docs.audius.co/api/
- SDK guide: https://docs.audius.co/sdk/
- OAuth / mobile guide: https://docs.audius.co/developers/guides/log-in-with-audius/

## Playback lifecycle
The player is a single app-level service, not a component-local audio instance.

1. UI dispatches a play request with a domain Track.
2. Playback service asks the relevant MusicSource for an authorized stream.
3. Audio adapter loads the stream and reports status events.
4. Zustand receives normalized playback state.
5. Mini-player, Now Playing, queue, and OS media controls render from the same state.
6. On failure, service reports a typed error and follows an explicit queue policy.

Queue policy:
- Selecting a track from a playlist enqueues the selected track and following playlist tracks.
- Selecting a single search result enqueues that track without unexpectedly replacing unrelated user-created playlists.
- Next/previous handles queue boundaries and repeat modes deterministically.
- Removing the currently playing item has a defined transition.

## Network and failure handling
- Debounce search input.
- Cancel obsolete requests where supported.
- Paginate large result sets.
- Use bounded retries for transient failures.
- Do not retry permanent unavailable / forbidden responses endlessly.
- Display offline, empty, rate-limited, and source-unavailable states.
- Never use fabricated track metadata as fallback for real results.

## Security, privacy, and rights
- Keep provider bearer tokens and private credentials out of the client.
- Use OS secure storage for user session tokens.
- Collect minimal personal data.
- Provide clear privacy disclosures for listening history and analytics.
- Do not scrape other streaming services or extract their audio.
- Do not download, cache, re-host, or redistribute tracks unless the provider explicitly permits it.
- Preserve required attribution and canonical source links.
- Verify Audius terms and each track's availability before enabling playback or downloads.
- Offline downloads are out of scope until explicitly permitted by the source.

## Testing strategy
Unit tests:
- Provider response normalization.
- Search debounce and pagination.
- Queue insertion, removal, and reordering.
- Shuffle and repeat boundary logic.
- Persistence serialization and migration.

Integration tests:
- Audius search and trending requests.
- Stream URL resolution for eligible tracks.
- Restricted and unavailable track handling.
- Player state synchronization across screens.

Device QA:
- Android foreground/background/notification controls.
- iOS background audio and lock-screen controls.
- Calls, alarms, Bluetooth route changes, headphones, network loss, and app termination.
- Small and large screens, safe areas, and accessibility settings.

## Phase gates
- **Gate 1 — Specification:** product and architecture documents reviewed.
- **Gate 2 — UI:** main screens work with typed mock data; no provider dependency in visual components.
- **Gate 3 — Integration:** Audius adapter and real search / streaming are connected.
- **Gate 4 — Audio:** background and lock-screen acceptance tests pass on both platforms.
- **Gate 5 — Release:** QA, privacy disclosures, rights review, and production configuration complete.
