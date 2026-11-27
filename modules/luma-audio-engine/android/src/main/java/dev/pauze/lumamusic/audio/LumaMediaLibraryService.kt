package dev.pauze.lumamusic.audio

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibrarySession
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/** Exposes the app's shared ExoPlayer through an Android Auto-compatible library session. */
@UnstableApi
class LumaMediaLibraryService : MediaLibraryService() {
  private var librarySession: MediaLibrarySession? = null

  override fun onCreate() {
    super.onCreate()
    val sharedPlayer = LumaSharedPlayer.getOrCreate(applicationContext)
    librarySession = MediaLibrarySession.Builder(this, sharedPlayer, LibraryCallback()).build()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? =
    librarySession

  override fun onDestroy() {
    librarySession?.release()
    librarySession = null
    LumaSharedPlayer.release()
    super.onDestroy()
  }

  private class LibraryCallback : MediaLibrarySession.Callback {
    override fun onGetLibraryRoot(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<MediaItem>> {
      val root = MediaItem.Builder()
        .setMediaId(ROOT_ID)
        .setMediaMetadata(
          MediaMetadata.Builder()
            .setTitle("LumaMusic")
            .setIsBrowsable(true)
            .setIsPlayable(false)
            .build()
        )
        .build()
      return Futures.immediateFuture(LibraryResult.ofItem(root, params))
    }

    override fun onGetChildren(
      session: MediaLibrarySession,
      browser: MediaSession.ControllerInfo,
      parentId: String,
      page: Int,
      pageSize: Int,
      params: LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> =
      Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.of(), params))

    companion object {
      private const val ROOT_ID = "lumamusic_root"
    }
  }
}
