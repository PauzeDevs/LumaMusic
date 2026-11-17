package dev.pauze.lumamusic.audio

import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

class LumaAudioEngineModule : Module() {
  private var player: ExoPlayer? = null
  private val handler = Handler(Looper.getMainLooper())
  private val released = AtomicBoolean(false)
  private var activeTrackId: String? = null
  private var lastError: String? = null

  private val progressEmitter = object : Runnable {
    override fun run() {
      val current = player ?: return
      emitState(current)
      if (!released.get()) handler.postDelayed(this, 250L)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("LumaAudioEngine")
    Events("onStateChange")

    OnCreate {
      released.set(false)
      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is not available.")
      player = ExoPlayer.Builder(context).build().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build(),
          true
        )
        addListener(object : Player.Listener {
          override fun onPlaybackStateChanged(playbackState: Int) {
            emitState(this@apply)
          }
          override fun onIsPlayingChanged(isPlaying: Boolean) {
            emitState(this@apply)
          }
          override fun onPlayerError(error: PlaybackException) {
            lastError = error.message ?: "Playback failed."
            emitState(this@apply)
          }
          override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            emitState(this@apply)
          }
        })
      }
      handler.removeCallbacks(progressEmitter)
      handler.post(progressEmitter)
    }

    AsyncFunction("getCapabilities") { sourceKind: String ->
      mapOf(
        "nativePlayback" to true,
        "equalizer" to false,
        "limiter" to false,
        "reverb" to false,
        "spatial" to false,
        "audioTap" to false,
        "sourceKind" to sourceKind,
        "reasonUnavailable" to "Transport is available; DSP is not connected to the Media3 audio sink yet."
      )
    }

    AsyncFunction("getState") {
      stateMap(player)
    }

    AsyncFunction("load") { track: Map<String, Any?>, startPositionSeconds: Double? ->
      val current = requirePlayer()
      val id = track["id"] as? String ?: throw IllegalArgumentException("Track id is required.")
      val uri = track["uri"] as? String ?: throw IllegalArgumentException("Track URI is required.")
      require(uri.isNotBlank()) { "Track URI cannot be empty." }
      val title = track["title"] as? String ?: ""
      val artist = track["artist"] as? String ?: ""
      val headers = (track["headers"] as? Map<*, *>)?.entries
        ?.mapNotNull { (key, value) ->
          if (key is String && value is String) key to value else null
        }?.toMap().orEmpty()

      activeTrackId = id
      lastError = null
      val httpFactory = DefaultHttpDataSource.Factory()
        .setUserAgent("LumaMusic/0.1")
        .setAllowCrossProtocolRedirects(true)
        .setDefaultRequestProperties(headers)
      val dataSourceFactory = DefaultDataSource.Factory(current.applicationLooper.let {
        appContext.reactContext ?: throw IllegalStateException("React context is not available.")
      }, httpFactory)
      val sourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
      current.setMediaSource(sourceFactory.createMediaSource(
        MediaItem.Builder()
          .setUri(Uri.parse(uri))
          .setMediaMetadata(MediaMetadata.Builder().setTitle(title).setArtist(artist).build())
          .build()
      ))
      val startMs = ((startPositionSeconds ?: 0.0).coerceAtLeast(0.0) * 1000.0).toLong()
      current.prepare()
      if (startMs > 0L) current.seekTo(startMs)
      emitState(current)
    }

    AsyncFunction("play") {
      requirePlayer().play()
      emitState(requirePlayer())
    }

    AsyncFunction("pause") {
      requirePlayer().pause()
      emitState(requirePlayer())
    }

    AsyncFunction("seekTo") { positionSeconds: Double ->
      require(positionSeconds.isFinite() && positionSeconds >= 0.0) { "Seek position must be finite and non-negative." }
      requirePlayer().seekTo((positionSeconds * 1000.0).toLong())
      emitState(requirePlayer())
    }

    AsyncFunction("setPlaybackRate") { rate: Double ->
      require(rate.isFinite() && rate in 0.5..2.0) { "Playback rate must be between 0.5x and 2.0x." }
      requirePlayer().setPlaybackSpeed(rate.toFloat())
      emitState(requirePlayer())
    }

    AsyncFunction("release") {
      releasePlayer()
    }

    OnDestroy {
      releasePlayer()
    }
  }

  private fun requirePlayer(): ExoPlayer =
    player ?: throw IllegalStateException("Native audio engine has not been initialized.")

  private fun stateMap(current: ExoPlayer?): Map<String, Any?> {
    if (current == null) return mapOf(
      "trackId" to activeTrackId, "isPlaying" to false, "isBuffering" to false,
      "positionSeconds" to 0.0, "durationSeconds" to 0.0, "bufferedSeconds" to 0.0,
      "playbackRate" to 1.0, "error" to lastError
    )
    val duration = current.duration.takeIf { it != C.TIME_UNSET && it >= 0L } ?: 0L
    return mapOf(
      "trackId" to activeTrackId,
      "isPlaying" to current.isPlaying,
      "isBuffering" to current.playbackState == Player.STATE_BUFFERING,
      "positionSeconds" to current.currentPosition.coerceAtLeast(0L) / 1000.0,
      "durationSeconds" to duration / 1000.0,
      "bufferedSeconds" to current.bufferedPosition.coerceAtLeast(0L) / 1000.0,
      "playbackRate" to current.playbackParameters.speed.toDouble(),
      "error" to lastError
    )
  }

  private fun emitState(current: ExoPlayer) {
    if (!released.get()) sendEvent("onStateChange", stateMap(current))
  }

  private fun releasePlayer() {
    if (!released.compareAndSet(false, true)) return
    handler.removeCallbacks(progressEmitter)
    player?.release()
    player = null
    activeTrackId = null
  }
}
