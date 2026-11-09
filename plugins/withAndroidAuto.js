const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE = "dev.pauze.lumamusic";
const SERVICE = `${PACKAGE}.car.LumaMediaLibraryService`;

function withAndroidAutoMedia(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) throw new Error("LumaMusic Android application manifest is missing.");

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    const permissions = [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
    ];
    for (const name of permissions) {
      if (!manifest["uses-permission"].some((item) => item.$["android:name"] === name)) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }

    app.service = app.service || [];
    if (!app.service.some((item) => item.$["android:name"] === SERVICE)) {
      app.service.push({
        $: {
          "android:name": SERVICE,
          "android:exported": "true",
          "android:foregroundServiceType": "mediaPlayback",
          "android:label": "LumaMusic"
        },
        "intent-filter": [
          { action: [{ $: { "android:name": "androidx.media3.session.MediaLibraryService" } }] },
          { action: [{ $: { "android:name": "android.media.browse.MediaBrowserService" } }] }
        ]
      });
    }
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("androidx.media3:media3-session")) {
      const dependencyBlock = /dependencies\\s*\\{/;
      if (!dependencyBlock.test(contents)) throw new Error("Could not locate the Android app dependencies block.");
      contents = contents.replace(dependencyBlock, (match) =>
        match + '\\n    implementation("androidx.media3:media3-exoplayer:1.7.1")\\n    implementation("androidx.media3:media3-session:1.7.1")'
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withDangerousMod(config, ["android", async (mod) => {
    const root = mod.modRequest.platformProjectRoot;
    const packagePath = PACKAGE.split(".").join(path.sep);
    const sourceDir = path.join(root, "app", "src", "main", "java", packagePath, "car");
    const xmlDir = path.join(root, "app", "src", "main", "res", "xml");
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.writeFileSync(path.join(xmlDir, "automotive_app_desc.xml"),
      '<?xml version="1.0" encoding="utf-8"?>\\n<automotiveApp xmlns:android="http://schemas.android.com/apk/res/android"><uses name="media" /></automotiveApp>\\n'
    );
    fs.writeFileSync(path.join(sourceDir, "LumaMediaLibraryService.kt"), KOTLIN_SERVICE);
    return mod;
  }]);

  return config;
}

const KOTLIN_SERVICE = `package dev.pauze.lumamusic.car

import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibrarySession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import java.io.File
import java.util.concurrent.Executors

class LumaMediaLibraryService : MediaLibraryService() {
    private lateinit var player: ExoPlayer
    private lateinit var librarySession: MediaLibrarySession
    private val ioExecutor = Executors.newSingleThreadExecutor()

    override fun onCreate() {
        super.onCreate()
        player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(
                androidx.media3.common.AudioAttributes.Builder()
                    .setUsage(androidx.media3.common.C.USAGE_MEDIA)
                    .setContentType(androidx.media3.common.C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true
            )
            setHandleAudioBecomingNoisy(true)
        }
        librarySession = MediaLibrarySession.Builder(this, player, LibraryCallback()).build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession = librarySession

    override fun onTaskRemoved(rootIntent: android.content.Intent?) {
        if (!player.isPlaying) stopSelf()
    }

    override fun onDestroy() {
        if (::librarySession.isInitialized) librarySession.release()
        if (::player.isInitialized) player.release()
        ioExecutor.shutdown()
        super.onDestroy()
    }

    private fun rootItem(): MediaItem = MediaItem.Builder()
        .setMediaId(ROOT_ID)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle("LumaMusic")
                .setSubtitle("Your music, ready for the road")
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
                .build()
        ).build()

    private fun localFolder(): MediaItem = MediaItem.Builder()
        .setMediaId(LOCAL_ID)
        .setMediaMetadata(
            MediaMetadata.Builder()
                .setTitle("Imported music")
                .setSubtitle("Audio stored in LumaMusic")
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MUSIC)
                .build()
        ).build()

    private fun importedAudio(): List<MediaItem> {
        val musicDir = File(filesDir, "music")
        val files = musicDir.listFiles()?.filter { file ->
            file.isFile && file.extension.lowercase() in AUDIO_EXTENSIONS
        }?.sortedBy { it.name.lowercase() } ?: emptyList()

        return files.map { file ->
            val title = file.nameWithoutExtension
                .replace(Regex("[-_]\\\\d+[-_]\\\\d+$"), "")
                .replace("%20", " ")
            val uri = Uri.fromFile(file)
            MediaItem.Builder()
                .setMediaId(uri.toString())
                .setUri(uri)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle(title.ifBlank { file.nameWithoutExtension })
                        .setArtist("On this device")
                        .setAlbumTitle("LumaMusic imports")
                        .setIsBrowsable(false)
                        .setIsPlayable(true)
                        .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
                        .build()
                ).build()
        }
    }

    private inner class LibraryCallback : MediaLibrarySession.Callback {
        override fun onGetLibraryRoot(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            params: MediaLibraryService.LibraryParams?
        ): ListenableFuture<LibraryResult<MediaItem>> {
            return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params))
        }

        override fun onGetChildren(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            parentId: String,
            page: Int,
            pageSize: Int,
            params: MediaLibraryService.LibraryParams?
        ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
            val items = when (parentId) {
                ROOT_ID -> listOf(localFolder())
                LOCAL_ID -> importedAudio()
                else -> emptyList()
            }
            val start = (page * pageSize).coerceAtMost(items.size)
            val end = (start + pageSize).coerceAtMost(items.size)
            return Futures.immediateFuture(
                LibraryResult.ofItemList(ImmutableList.copyOf(items.subList(start, end)), params)
            )
        }

        override fun onGetItem(
            session: MediaLibrarySession,
            browser: MediaSession.ControllerInfo,
            mediaId: String
        ): ListenableFuture<LibraryResult<MediaItem>> {
            val item = if (mediaId == ROOT_ID) rootItem()
                else if (mediaId == LOCAL_ID) localFolder()
                else importedAudio().firstOrNull { it.mediaId == mediaId }
            return Futures.immediateFuture(
                if (item == null) LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE)
                else LibraryResult.ofItem(item, null)
            )
        }
    }

    companion object {
        private const val TAG = "LumaCarMedia"
        private const val ROOT_ID = "lumamusic_root"
        private const val LOCAL_ID = "lumamusic_imported"
        private val AUDIO_EXTENSIONS = setOf("mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "3gp")
    }
}
`;

module.exports = withAndroidAutoMedia;
