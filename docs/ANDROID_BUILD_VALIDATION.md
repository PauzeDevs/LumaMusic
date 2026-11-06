# Android build validation

This pull request runs the Android debug APK job and both platform JavaScript bundle exports. The APK is considered validated only when the native Gradle build succeeds and the `lumamusic-android-debug` artifact is uploaded.

Dependency alignment retry after the initial CI run identified Expo SDK version mismatches.

The SDK 57 Expo Asset package is pinned directly to prevent npm from resolving an incompatible newer SDK major.

This revision fixes the player progress-bar width types and uses a supported Ionicons glyph for the audio device action.

This revision narrows the optional Audius source track ID before passing it to the stream URL helper.

Build validation rerun for the stream-ID type guard.

This revision restores persistent liked-track and listening-history state required by the player and library screens.
