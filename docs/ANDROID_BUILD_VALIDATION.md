# Android build validation

This pull request runs the Android debug APK job and both platform JavaScript bundle exports. The APK is considered validated only when the native Gradle build succeeds and the `lumamusic-android-debug` artifact is uploaded.
