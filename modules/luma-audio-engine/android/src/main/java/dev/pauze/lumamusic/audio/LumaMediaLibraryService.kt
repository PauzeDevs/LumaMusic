package dev.pauze.lumamusic.audio

import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaLibraryService.LibraryParams
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService.MediaLibrarySession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.SettableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/** Exposes the app's shared ExoPlayer and local library through Android Auto. */
@UnstableApi
class LumaMediaLibraryService : MediaLibraryService() {
  private var librarySession: MediaLibrarySession? = null

  override fun onCreate() {
    super.onCreate()
    val sharedPlayer = LumaSharedPlayer.getOrCreate(applicationContext)
    librarySession = MediaLibrarySession.Builder(this, sharedPlayer, LibraryCallback()).build()
    activeSession = librarySession
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? =
    librarySession

  override fun onDestroy() {
    librarySession?.release()
    librarySession = null
    activeSession = null
    pendingTrackRequests.values.forEach { it.cancel(false) }
    pendingTrackRequests.clear()
    LumaSharedPlayer.release()
    super.onDestroy()
  }

  companion object {
    private const val ROOT_ID = "lumamusic_root"
    private const val LIKED_ID = "category:liked"
    private const val RECENT_ID = "category:recent"
    private const val PLAYLISTS_ID = "category:playlists"
    private val requestHandler = Handler(Looper.getMainLooper())
    private val pendingTrackRequests = ConcurrentHashMap<String, SettableFuture<List<MediaItem>>>()

    @Volatile private var activeSession: MediaLibrarySession? = null
    @Volatile private var catalog: Map<String, Any?> = emptyMap()
    @Volatile private var trackRequestListener: ((String) -> Unit)? = null

    fun updatePlayer(player: androidx.media3.common.Player) {
      activeSession?.setPlayer(player)
    }

    fun updateCatalog(value: Map<String, Any?>) {
      catalog = value
      activeSession?.let { session ->
        session.notifyChildrenChanged(ROOT_ID, 3, null)
        session.notifyChildrenChanged(LIKED_ID, trackList("likedTracks").size, null)
        session.notifyChildrenChanged(RECENT_ID, trackList("recentTracks").size, null)
        session.notifyChildrenChanged(PLAYLISTS_ID, playlistList().size, null)
        playlistList().forEach { playlist ->
          val id = playlist["id"] as? String ?: return@forEach
          session.notifyChildrenChanged("playlist:$id", (playlist["tracks"] as? List<*>)?.size ?: 0, null)
        }
      }
    }

    fun setTrackRequestListener(listener: ((String) -> Unit)?) {
      trackRequestListener = listener
    }

    fun completeTrackRequest(trackId: String, mediaItem: MediaItem): Boolean {
      val pending = pendingTrackRequests.remove(trackId) ?: return false
      requestHandler.removeCallbacksAndMessages(trackId)
      return pending.set(listOf(mediaItem))
    }

    private fun trackList(key: String): List<Map<String, Any?>> =
      (catalog[key] as? List<*>)?.mapNotNull { it as? Map<String, Any?> }.orEmpty()

    private fun playlistList(): List<Map<String, Any?>> =
      (catalog["playlists"] as? List<*>)?.mapNotNull { it as? Map<String, Any?> }.orEmpty()

    private fun trackItem(track: Map<String, Any?>): MediaItem? {
      val id = track["id"] as? String ?: return null
      if (id.isBlank()) return null
      val metadata = MediaMetadata.Builder()
        .setTitle(track["title"] as? String ?: "Unknown track")
        .setArtist(track["artist"] as? String ?: "Unknown artist")
        .apply {
          (track["artwork"] as? String)?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
            ?.let { setArtworkUri(Uri.parse(it)) }
        }
        .setIsBrowsable(false)
        .setIsPlayable(true)
        .build()
      return MediaItem.Builder().setMediaId("track:$id").setMediaMetadata(metadata).build()
    }

    private fun categoryItem(id: String, title: String): MediaItem =
      MediaItem.Builder().setMediaId(id).setMediaMetadata(
        MediaMetadata.Builder().setTitle(title).setIsBrowsable(true).setIsPlayable(false).build()
      ).build()
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
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
      val children = when (parentId) {
        ROOT_ID -> listOf(
          categoryItem(LIKED_ID, "Liked Songs"),
          categoryItem(RECENT_ID, "Recently Played"),
          categoryItem(PLAYLISTS_ID, "Playlists")
        )
        LIKED_ID -> trackList("likedTracks").mapNotNull { trackItem(it) }
        RECENT_ID -> trackList("recentTracks").mapNotNull { trackItem(it) }
        PLAYLISTS_ID -> playlistList().mapNotNull { playlist ->
          val id = playlist["id"] as? String ?: return@mapNotNull null
          MediaItem.Builder().setMediaId("playlist:$id").setMediaMetadata(
            MediaMetadata.Builder()
              .setTitle(playlist["name"] as? String ?: "Playlist")
              .setIsBrowsable(true)
              .setIsPlayable(false)
              .apply {
                (playlist["coverUri"] as? String)?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
                  ?.let { setArtworkUri(Uri.parse(it)) }
              }
              .build()
          ).build()
        }
        else -> if (parentId.startsWith("playlist:")) {
          val playlistId = parentId.removePrefix("playlist:")
          playlistList().firstOrNull { it["id"] == playlistId }
            ?.get("tracks").let { tracks ->
              (tracks as? List<*>)?.mapNotNull { (it as? Map<String, Any?>)?.let { trackItem(it) } }.orEmpty()
            }
        } else emptyList()
      }
      val start = (page * pageSize).coerceAtLeast(0).coerceAtMost(children.size)
      val end = (start + pageSize).coerceAtMost(children.size)
      val pageItems = ImmutableList.copyOf(children.subList(start, end))
      return Futures.immediateFuture(LibraryResult.ofItemList(pageItems, params))
    }

    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): ListenableFuture<MutableList<MediaItem>> {
      val requested = mediaItems.firstOrNull()
        ?: return Futures.immediateFuture(mediaItems)
      val trackId = requested.mediaId.removePrefix("track:")
      if (trackId.isBlank() || trackId == requested.mediaId) {
        return Futures.immediateFailedFuture(IllegalArgumentException("Unknown LumaMusic media item."))
      }

      pendingTrackRequests.remove(trackId)?.cancel(false)
      val future = SettableFuture.create<List<MediaItem>>()
      pendingTrackRequests[trackId] = future
      trackRequestListener?.invoke(trackId)
      requestHandler.postAtTime({
        if (pendingTrackRequests.remove(trackId, future)) {
          future.setException(IllegalStateException("LumaMusic could not resolve this track in time."))
        }
      }, trackId, android.os.SystemClock.uptimeMillis() + TimeUnit.SECONDS.toMillis(45))
      @Suppress("UNCHECKED_CAST")
      return future as ListenableFuture<MutableList<MediaItem>>
    }

    companion object {
      private const val ROOT_ID = "lumamusic_root"
    }
  }
}
