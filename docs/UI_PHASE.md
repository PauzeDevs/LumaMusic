# LumaMusic UI Phase

**Status:** UI prototype scaffold created; provider integration is intentionally not connected.

## Implemented screens
- Listen / Home
- Search
- Library
- Profile / Settings
- Now Playing
- Persistent custom tab bar and mini-player

## Prototype behaviour
- Sample track and playlist data is used.
- Selecting a sample track updates the shared Zustand player state.
- Mini-player opens Now Playing.
- Play/pause and next-track controls update mock player state.
- Search filters the local sample catalogue.

## Not implemented yet
- Real Audius requests or API credentials.
- Actual audio streaming.
- Background audio or lock-screen integration.
- Durable favourites, playlists, or listening history.
- User authentication.

## Next UI acceptance pass
- Install dependencies and run TypeScript checks.
- Inspect on narrow Android and iPhone layouts.
- Verify safe areas, tab navigation, scroll behaviour, artwork loading, and Now Playing layout.
- Fix all compile/runtime issues before starting Audius integration.
