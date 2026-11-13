# On-device YouTube PoToken generation

Android generates video-bound YouTube Proof-of-Origin tokens locally inside a hidden WebView. There is no LumaMusic API server, VPS, Vercel deployment, or API URL to configure.

## Runtime

- The hidden WebView loads YouTube and initializes the BotGuard challenge in the YouTube page context.
- The MIT-licensed `bgutils-js` 4.0.3 modules are loaded from jsDelivr at runtime.
- The WebView runs the BotGuard challenge, requests the integrity token from Google's attestation endpoint, and mints a content-bound token for the requested video ID.
- The token is returned to the React Native playback resolver and appended to the media URL as `pot=`.
- Token generation is best-effort. If YouTube, Google attestation, the CDN, or WebView blocks the challenge, the existing InnerTube and NewPipe paths continue without a token.

## Build requirements

This uses `react-native-webview`, which is included through Expo SDK 57's recommended package version. A new native Android build is required after installing it. Expo Go may already include the module, but production APKs must be rebuilt with the native dependency.

## Licensing

The BotGuard helper library is MIT-licensed. This does not copy Mochy-Music's GPL implementation and does not change LumaMusic's EPL-2.0 project licence.
