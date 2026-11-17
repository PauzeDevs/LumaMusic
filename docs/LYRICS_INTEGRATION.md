# LumaMusic lyrics integration

Set `EXPO_PUBLIC_LYRICS_API_URL` to the HTTPS base URL of the LumaMusic lyrics service. The app calls `GET /v1/lyrics?source=...&sourceTrackId=...&title=...&artist=...&durationMs=...`.

Return `{"status":"available","format":"lrc","lyrics":"[00:12.40]Example line","provider":"Licensed provider","copyright":"Provider copyright notice","attribution":{"text":"Lyrics powered by Provider","url":"https://provider.example/track"}}`. Also support `{"status":"not_found"}` and `{"status":"restricted"}` (HTTP 404 and 403 respectively).

## Rights and provider requirements

- Use an official lyrics API under an agreement that explicitly permits display in a consumer music app and covers LumaMusic's distribution territories.
- Musixmatch is a candidate, not an enabled provider. Obtain the appropriate commercial plan/contract and follow its current attribution, copyright, country restriction, tracking, and backlink requirements before enabling it.
- Keep provider API keys on the server. Never ship them in the Expo client.
- Match on title, artist, duration, and recording identifiers where available. Never match by title alone.
- Prefer timestamped LRC. Plain text is supported as a fallback.
- Do not scrape lyrics websites, reverse engineer private endpoints, use unofficial embedded keys, or generate missing lyrics.
- Do not cache or retain lyrics unless the provider agreement explicitly permits it.
- Lyrics rights are separate from sound recording and music streaming rights.

Implement a server-side adapter such as `findLyrics({ source, sourceTrackId, title, artist, durationMs, territory })`. Normalize licensed provider responses into the client contract, enforce territory restrictions, and pass through exact copyright and attribution data. Return `restricted` instead of lyric text whenever display is not authorized.
