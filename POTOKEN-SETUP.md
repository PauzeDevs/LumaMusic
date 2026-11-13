# Independent PoToken service

LumaMusic can optionally request YouTube BotGuard Proof-of-Origin tokens from a separate Node.js endpoint. This route uses the MIT-licensed `bgutils-js` package and `jsdom`; it does not copy Mochy-Music's GPL implementation.

## Deploy

1. Deploy this repository to Vercel.
2. The API route is available at `/api/potoken`.
3. Set `EXPO_PUBLIC_POTOKEN_API_URL` in the Expo build environment to the full endpoint URL, for example `https://your-deployment.vercel.app/api/potoken`.
4. Rebuild the native app so the public Expo environment variable is included.

The endpoint accepts a POST body containing an 11-character YouTube `videoId`. It returns a session-bound token (bound to YouTube visitor data), a content-bound token (bound to the video ID), and an expiry timestamp.

## Behaviour

- InnerTube remains the primary playback resolver.
- When configured, LumaMusic obtains PoTokens and adds the session token to the InnerTube player request's `serviceIntegrityDimensions.poToken` field.
- The content token is appended to the returned media URL as `pot=`.
- If the service is not configured or token generation fails, the existing InnerTube and NewPipe paths continue to run.
- Tokens are not treated as a guaranteed bypass. YouTube can still reject requests based on its own risk checks, client profile, network, or service-side changes.

## Licensing

The PoToken route depends on `bgutils-js` (MIT) and `jsdom` (MIT). LumaMusic's existing EPL-2.0 project licence is not replaced by this integration. The MIT notices for dependencies remain applicable.
