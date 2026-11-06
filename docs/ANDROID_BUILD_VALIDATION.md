# Android build validation

This pull request runs the Android debug APK job and both platform JavaScript bundle exports. The APK is considered validated only when the native Gradle build succeeds and the `lumamusic-android-debug` artifact is uploaded.

Dependency alignment retry after the initial CI run identified Expo SDK version mismatches.

The SDK 57 Expo Asset package is pinned directly to prevent npm from resolving an incompatible newer SDK major.
