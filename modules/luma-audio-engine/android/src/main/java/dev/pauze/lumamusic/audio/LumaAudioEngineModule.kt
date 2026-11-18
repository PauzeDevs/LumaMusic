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
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicBoolean

@UnstableApi
class LumaAudioEngineModule : Module() {
  private var player: ExoPlayer? = null
  private var pcmProcessor: LumaPcmAudioProcessor? = null
  private val handler = Handler(Looper.getMainLooper())
  private val released = AtomicBoolean(false)
  private var activeTrackId: String? = null
  private var catalogDurationSeconds: Double = 0.0
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
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available.")
      pcmProcessor = LumaPcmAudioProcessor()
      player = ExoPlayer.Builder(context, LumaRenderersFactory(context, pcmProcessor!!)).build().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build(),
          true
        )
        addListener(object : Player.Listener {
          override fun onPlaybackStateChanged(playbackState: Int) = emitState(this@apply)
          override fun onIsPlayingChanged(isPlaying: Boolean) = emitState(this@apply)
          override fun onPlayerError(error: PlaybackException) {
            lastError = error.message ?: "Playback failed."
            emitState(this@apply)
          }
          override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = emitState(this@apply)
        })
      }
      handler.removeCallbacks(progressEmitter)
      handler.post(progressEmitter)
    }

    AsyncFunction("getCapabilities") { sourceKind: String ->
      mapOf(
        "nativePlayback" to true,
        "equalizer" to true,
        "limiter" to true,
        "reverb" to true,
        "spatial" to true,
        "audioTap" to false,
        "sourceKind" to sourceKind,
        "reasonUnavailable" to null
      )
    }

    AsyncFunction("getState") { promise: Promise ->
      runOnMain(promise) { stateMap(player) }
    }

    AsyncFunction("load") { track: Map<String, Any?>, startPositionSeconds: Double?, promise: Promise ->
      runOnMain(promise) {
        val current = requirePlayer()
        val id = track["id"] as? String ?: throw IllegalArgumentException("Track id is required.")
        val uri = track["uri"] as? String ?: throw IllegalArgumentException("Track URI is required.")
        require(uri.isNotBlank()) { "Track URI cannot be empty." }
        val title = track["title"] as? String ?: ""
        val artist = track["artist"] as? String ?: ""
        catalogDurationSeconds = (track["durationSeconds"] as? Number)?.toDouble()?.takeIf { it.isFinite() && it > 0.0 } ?: 0.0
        val headers = (track["headers"] as? Map<*, *>)?.entries
          ?.mapNotNull { (key, value) ->
            if (key is String && value is String) key to value else null
          }?.toMap().orEmpty()

        activeTrackId = id
        lastError = null
        val context = appContext.reactContext?.applicationContext
          ?: throw IllegalStateException("React context is not available.")
        val httpFactory = DefaultHttpDataSource.Factory()
          .setUserAgent("LumaMusic/0.1")
          .setAllowCrossProtocolRedirects(true)
          .setDefaultRequestProperties(headers)
        val dataSourceFactory = DefaultDataSource.Factory(context, httpFactory)
        val sourceFactory = DefaultMediaSourceFactory(dataSourceFactory)
        val mediaItemBuilder = MediaItem.Builder()
          .setUri(Uri.parse(uri))
          .setMediaMetadata(MediaMetadata.Builder().setTitle(title).setArtist(artist).build())
        (track["mimeType"] as? String)?.substringBefore(";")?.takeIf { it.isNotBlank() }?.let {
          mediaItemBuilder.setMimeType(it)
        }
        current.setMediaSource(sourceFactory.createMediaSource(mediaItemBuilder.build()))
        val startMs = ((startPositionSeconds ?: 0.0).coerceAtLeast(0.0) * 1000.0).toLong()
        current.prepare()
        if (startMs > 0L) current.seekTo(startMs)
        emitState(current)
        null
      }
    }

    AsyncFunction("play") { promise: Promise ->
      runOnMain(promise) { requirePlayer().play(); emitState(requirePlayer()); null }
    }

    AsyncFunction("pause") { promise: Promise ->
      runOnMain(promise) { requirePlayer().pause(); emitState(requirePlayer()); null }
    }

    AsyncFunction("seekTo") { positionSeconds: Double, promise: Promise ->
      runOnMain(promise) {
        require(positionSeconds.isFinite() && positionSeconds >= 0.0) { "Seek position must be finite and non-negative." }
        requirePlayer().seekTo((positionSeconds * 1000.0).toLong())
        emitState(requirePlayer())
        null
      }
    }

    AsyncFunction("setPlaybackRate") { rate: Double, promise: Promise ->
      runOnMain(promise) {
        require(rate.isFinite() && rate in 0.5..2.0) { "Playback rate must be between 0.5x and 2.0x." }
        requirePlayer().setPlaybackSpeed(rate.toFloat())
        emitState(requirePlayer())
        null
      }
    }

    AsyncFunction("setAudioLab") { configuration: Map<String, Any?>, promise: Promise ->
      runOnMain(promise) {
        val enabled = configuration["enabled"] as? Boolean ?: false
        val rawBands = configuration["equalizerDb"] as? List<*>
          ?: throw IllegalArgumentException("equalizerDb must contain five numeric values.")
        require(rawBands.size == 5) { "Exactly five EQ band values are required." }
        val bands = rawBands.map {
          (it as? Number)?.toFloat()
            ?: throw IllegalArgumentException("EQ band values must be numeric.")
        }.toFloatArray()
        val preamp = (configuration["preampDb"] as? Number)?.toFloat() ?: 0f
        val limiter = configuration["limiterEnabled"] as? Boolean ?: true
        val reverb = configuration["reverbPreset"] as? String ?: "off"
        val balance = (configuration["spatialBalance"] as? Number)?.toFloat() ?: 0f
        require(preamp.isFinite()) { "Preamp must be finite." }
        require(bands.all { it.isFinite() }) { "EQ gains must be finite." }
        require(preamp in -12f..6f) { "Preamp must be between -12 and +6 dB." }
        require(bands.all { it in -12f..12f }) { "EQ gains must be between -12 and +12 dB." }
        require(reverb in setOf("off", "room", "studio", "hall")) { "Unsupported reverb preset." }
        require(balance.isFinite() && balance in -1f..1f) { "Spatial balance must be between -1 and +1." }
        (pcmProcessor ?: throw IllegalStateException("DSP processor is not initialized."))
          .setAudioLab(enabled, bands, preamp, limiter, reverb, balance)
        null
      }
    }

    AsyncFunction("release") { promise: Promise ->
      runOnMain(promise) { releasePlayer(); null }
    }

    OnDestroy {
      if (Looper.myLooper() == Looper.getMainLooper()) {
        releasePlayer()
      } else {
        handler.post { releasePlayer() }
      }
    }
  }

  private fun <T> runOnMain(promise: Promise, action: () -> T) {
    handler.post {
      try {
        promise.resolve(action())
      } catch (error: Throwable) {
        promise.reject("E_LUMA_AUDIO", error.message ?: "Native audio operation failed.", error)
      }
    }
  }

  private fun requirePlayer(): ExoPlayer =
    player ?: throw IllegalStateException("Native audio engine has not been initialized.")

  private fun stateMap(current: ExoPlayer?): Map<String, Any?> {
    if (current == null) return mapOf(
      "trackId" to activeTrackId, "isPlaying" to false, "isBuffering" to false,
      "positionSeconds" to 0.0, "durationSeconds" to 0.0, "bufferedSeconds" to 0.0,
      "playbackRate" to 1.0, "error" to lastError, "isEnded" to false
    )
    val duration = current.duration.takeIf { it != C.TIME_UNSET && it > 0L }
      ?: (catalogDurationSeconds * 1000.0).toLong()
    return mapOf(
      "trackId" to activeTrackId,
      "isPlaying" to current.isPlaying,
      "isBuffering" to (current.playbackState == Player.STATE_BUFFERING),
      "positionSeconds" to current.currentPosition.coerceAtLeast(0L) / 1000.0,
      "durationSeconds" to duration / 1000.0,
      "bufferedSeconds" to current.bufferedPosition.coerceAtLeast(0L) / 1000.0,
      "playbackRate" to current.playbackParameters.speed.toDouble(),
      "error" to lastError,
      "isEnded" to (current.playbackState == Player.STATE_ENDED)
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
    pcmProcessor = null
    activeTrackId = null
  }
}
