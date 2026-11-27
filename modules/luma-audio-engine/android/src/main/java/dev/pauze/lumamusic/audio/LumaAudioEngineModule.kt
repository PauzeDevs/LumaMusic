package dev.pauze.lumamusic.audio

import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.content.Intent
import android.os.Build
import androidx.media3.exoplayer.source.MediaSource
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
  private var incomingPlayer: ExoPlayer? = null
  private var incomingPcmProcessor: LumaPcmAudioProcessor? = null
  private var incomingTrackId: String? = null
  private var incomingDurationSeconds: Double = 0.0
  private var crossfadeDurationMs = 0L
  private var crossfadeProgressMs = 0L
  private var crossfadeStartPositionMs = 0L
  private var crossfadeBeatDurationMs = 0L
  private var audioLabEnabled = false
  private var audioLabBands = FloatArray(5)
  private var audioLabPreamp = 0f
  private var audioLabLimiter = false
  private var audioLabReverb = "off"
  private var audioLabBalance = 0f
  private val handler = Handler(Looper.getMainLooper())
  private val released = AtomicBoolean(false)
  private var activeTrackId: String? = null
  private var catalogDurationSeconds: Double = 0.0
  private var lastError: String? = null
  private var foregroundPlaybackStarted = false
  private var sharedPlayerListener: Player.Listener? = null

  private val crossfadeEmitter = object : Runnable {
    override fun run() {
      val outgoing = player ?: return
      val incoming = incomingPlayer ?: return
      if (released.get()) return
      if (!outgoing.isPlaying || !incoming.isPlaying) {
        handler.postDelayed(this, 50L)
        return
      }
      val currentPositionMs = outgoing.currentPosition.coerceAtLeast(0L)
      if (currentPositionMs < crossfadeStartPositionMs &&
        outgoing.duration - currentPositionMs > crossfadeBeatDurationMs
      ) {
        handler.postDelayed(this, 50L)
        return
      }
      crossfadeProgressMs = (crossfadeProgressMs + 50L).coerceAtMost(crossfadeDurationMs)
      val progress = if (crossfadeDurationMs <= 0L) 1f
        else crossfadeProgressMs.toFloat() / crossfadeDurationMs.toFloat()
      val levels = LumaCrossfadeCurve.levels(progress)
      outgoing.volume = levels.first
      incoming.volume = levels.second
      if (crossfadeProgressMs >= crossfadeDurationMs) promoteIncomingPlayer()
      else handler.postDelayed(this, 50L)
    }
  }

  private val progressEmitter = object : Runnable {
    override fun run() {
      val current = player ?: return
      emitState(current)
      if (!released.get()) handler.postDelayed(this, 250L)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("LumaAudioEngine")
    Events("onStateChange", "onCrossfadeComplete", "onMediaItemRequested", "onTransportControlRequested")

    OnCreate {
      released.set(false)
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context is not available.")

      // The service and React Native module must share one player.
      LumaMediaLibraryService.setTrackRequestListener { trackId ->
        if (!released.get()) sendEvent("onMediaItemRequested", mapOf("trackId" to trackId))
      }
      LumaMediaLibraryService.setTransportControlListener { next ->
        if (!released.get()) sendEvent("onTransportControlRequested", mapOf("direction" to if (next) "next" else "previous"))
      }
      handler.post {
        if (released.get()) return@post
        player = LumaSharedPlayer.getOrCreate(context).also { sharedPlayer ->
          pcmProcessor = LumaSharedPlayer.processor()
          sharedPlayerListener?.let(sharedPlayer::removeListener)
          sharedPlayerListener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) = emitState(sharedPlayer)
            override fun onIsPlayingChanged(isPlaying: Boolean) = emitState(sharedPlayer)
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = emitState(sharedPlayer)
          }
          sharedPlayer.addListener(sharedPlayerListener!!)
        }
        handler.removeCallbacks(progressEmitter)
        handler.post(progressEmitter)
      }
    }

    AsyncFunction("setLibraryCatalog") { catalog: Map<String, Any?>, promise: Promise ->
      runOnMain(promise) {
        LumaMediaLibraryService.updateCatalog(catalog)
        null
      }
    }

    AsyncFunction("completeMediaItemRequest") { trackId: String, promise: Promise ->
      runOnMain(promise) {
        val currentItem = requirePlayer().currentMediaItem
          ?: throw IllegalStateException("The selected track has not loaded yet.")
        require(currentItem.mediaId == trackId) { "The loaded media item does not match the Android Auto request." }
        require(LumaMediaLibraryService.completeTrackRequest(trackId, currentItem)) {
          "The Android Auto media request is no longer active."
        }
        null
      }
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
      )
    }

    AsyncFunction("getState") { promise: Promise ->
      runOnMain(promise) { stateMap(player) }
    }

    AsyncFunction("load") { track: Map<String, Any?>, startPositionSeconds: Double?, promise: Promise ->
      runOnMain(promise) {
        cancelCrossfadeInternal()
        val current = requirePlayer()
        current.volume = 1f
        val id = track["id"] as? String ?: throw IllegalArgumentException("Track id is required.")
        val uri = track["uri"] as? String ?: throw IllegalArgumentException("Track URI is required.")
        require(uri.isNotBlank()) { "Track URI cannot be empty." }
        catalogDurationSeconds = (track["durationSeconds"] as? Number)?.toDouble()?.takeIf { it.isFinite() && it > 0.0 } ?: 0.0
        activeTrackId = id
        lastError = null
        current.setMediaSource(createMediaSource(track))
        val startMs = ((startPositionSeconds ?: 0.0).coerceAtLeast(0.0) * 1000.0).toLong()
        // A track selection is an explicit play intent. Arm playback before
        // prepare() so the decoder starts as soon as the stream becomes ready.
        current.playWhenReady = true
        current.prepare()
        if (startMs > 0L) current.seekTo(startMs)
        emitState(current)
        null
      }
    }

    AsyncFunction("prepareNext") { track: Map<String, Any?>, promise: Promise ->
      runOnMain(promise) {
        discardIncomingPlayer()
        val id = track["id"] as? String ?: throw IllegalArgumentException("Next track id is required.")
        val uri = track["uri"] as? String ?: throw IllegalArgumentException("Next track URI is required.")
        require(uri.isNotBlank()) { "Next track URI cannot be empty." }
        val processor = LumaPcmAudioProcessor().apply {
          setAudioLab(audioLabEnabled, audioLabBands, audioLabPreamp, audioLabLimiter, audioLabReverb, audioLabBalance)
        }
        val next = createPlayer(processor, handleAudioFocus = false)
        next.volume = 0f
        next.setMediaSource(createMediaSource(track))
        incomingPlayer = next
        incomingPcmProcessor = processor
        incomingTrackId = id
        incomingDurationSeconds = (track["durationSeconds"] as? Number)?.toDouble()
          ?.takeIf { it.isFinite() && it > 0.0 } ?: 0.0
        next.prepare()
        null
      }
    }

    AsyncFunction("startCrossfade") { durationSeconds: Double, promise: Promise ->
      runOnMain(promise) {
        require(durationSeconds.isFinite() && durationSeconds in 1.0..12.0) {
          "Crossfade duration must be between 1 and 12 seconds."
        }
        val outgoing = requirePlayer()
        val incoming = incomingPlayer ?: throw IllegalStateException("No prepared next track is available.")
        require(incoming.playbackState == Player.STATE_READY) {
          "The next stream is not ready; normal queue playback will be used."
        }
        require(outgoing.isPlaying) { "The current track is not playing." }
        crossfadeDurationMs = (durationSeconds * 1000.0).toLong()
        crossfadeProgressMs = 0L
        val bpm = pcmProcessor?.getEstimatedBpm()
        val beatMs = if (bpm != null && bpm in 60..180) (60_000.0 / bpm).toLong() else 0L
        crossfadeBeatDurationMs = beatMs
        crossfadeStartPositionMs = if (beatMs > 0L && outgoing.duration - outgoing.currentPosition > beatMs) {
          LumaBeatAlignment.nextBeatPositionMs(outgoing.currentPosition, bpm)
        } else outgoing.currentPosition
        incoming.volume = 0f
        incoming.play()
        handler.removeCallbacks(crossfadeEmitter)
        handler.post(crossfadeEmitter)
        null
      }
    }

    AsyncFunction("cancelCrossfade") { promise: Promise ->
      runOnMain(promise) { cancelCrossfadeInternal(); null }
    }

    AsyncFunction("play") { promise: Promise ->
      runOnMain(promise) {
        requirePlayer().play()
        incomingPlayer?.takeIf { crossfadeProgressMs > 0L }?.play()
        startMediaLibraryService()
        emitState(requirePlayer())
        null
      }
    }

    AsyncFunction("pause") { promise: Promise ->
      runOnMain(promise) {
        requirePlayer().pause()
        incomingPlayer?.pause()
        emitState(requirePlayer())
        null
      }
    }

    AsyncFunction("seekTo") { positionSeconds: Double, promise: Promise ->
      runOnMain(promise) {
        require(positionSeconds.isFinite() && positionSeconds >= 0.0) { "Seek position must be finite and non-negative." }
        cancelCrossfadeInternal()
        requirePlayer().seekTo((positionSeconds * 1000.0).toLong())
        emitState(requirePlayer())
        null
      }
    }

    AsyncFunction("setPlaybackRate") { rate: Double, promise: Promise ->
      runOnMain(promise) {
        require(rate.isFinite() && rate in 0.5..2.0) { "Playback rate must be between 0.5x and 2.0x." }
        requirePlayer().setPlaybackSpeed(rate.toFloat())
        incomingPlayer?.setPlaybackSpeed(rate.toFloat())
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
        audioLabEnabled = enabled
        audioLabBands = bands
        audioLabPreamp = preamp
        audioLabLimiter = limiter
        audioLabReverb = reverb
        audioLabBalance = balance
        (pcmProcessor ?: throw IllegalStateException("DSP processor is not initialized."))
          .setAudioLab(enabled, bands, preamp, limiter, reverb, balance)
        incomingPcmProcessor?.setAudioLab(enabled, bands, preamp, limiter, reverb, balance)
        null
      }
    }

    AsyncFunction("release") { promise: Promise ->
      runOnMain(promise) { cancelCrossfadeInternal(); requirePlayer().stop(); emitState(requirePlayer()); null }
    }

    OnDestroy {
      if (Looper.myLooper() == Looper.getMainLooper()) {
        detachModule()
      } else {
        handler.post { detachModule() }
      }
    }
  }

  private fun startMediaLibraryService() {
    if (foregroundPlaybackStarted) return
    val context = appContext.reactContext?.applicationContext ?: return
    val intent = Intent(context, LumaMediaLibraryService::class.java)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent)
      else context.startService(intent)
      foregroundPlaybackStarted = true
    } catch (error: Exception) {
      lastError = "Could not start Android media session service: ${error.message ?: "unknown error"}"
    }
  }

  private fun createMediaSource(track: Map<String, Any?>): MediaSource {
    val uri = track["uri"] as? String ?: throw IllegalArgumentException("Track URI is required.")
    val title = track["title"] as? String ?: ""
    val artist = track["artist"] as? String ?: ""
    val headers = (track["headers"] as? Map<*, *>)?.entries
      ?.mapNotNull { (key, value) -> if (key is String && value is String) key to value else null }
      ?.toMap().orEmpty()
    val context = appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("React context is not available.")
    val httpFactory = DefaultHttpDataSource.Factory()
      .setUserAgent("LumaMusic/0.1")
      .setAllowCrossProtocolRedirects(true)
      .setDefaultRequestProperties(headers)
    val sourceFactory = DefaultMediaSourceFactory(DefaultDataSource.Factory(context, httpFactory))
    val metadata = MediaMetadata.Builder()
      .setTitle(title)
      .setArtist(artist)
      .setAlbumTitle(track["album"] as? String ?: "LumaMusic")
      .apply {
        (track["artworkUri"] as? String)?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
          ?.let { setArtworkUri(Uri.parse(it)) }
      }
      .build()
    val mediaItem = MediaItem.Builder()
      .setMediaId(track["id"] as? String ?: "")
      .setUri(Uri.parse(uri))
      .setMediaMetadata(metadata)
      .apply {
        (track["mimeType"] as? String)?.substringBefore(";")?.takeIf { it.isNotBlank() }?.let { setMimeType(it) }
      }
      .build()
    return sourceFactory.createMediaSource(mediaItem)
  }

  private fun createPlayer(processor: LumaPcmAudioProcessor, handleAudioFocus: Boolean): ExoPlayer {
    val context = appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("React context is not available.")
    return ExoPlayer.Builder(context, LumaRenderersFactory(context, processor))
      .setLooper(Looper.getMainLooper())
      .build().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build(),
          handleAudioFocus
        )
        addListener(object : Player.Listener {
          override fun onPlayerError(error: PlaybackException) {
            if (this@apply === player) {
              lastError = error.message ?: "Playback failed."
              emitState(this@apply)
            } else if (this@apply === incomingPlayer) {
              cancelCrossfadeInternal()
            }
          }
        })
      }
  }

  private fun discardIncomingPlayer() {
    handler.removeCallbacks(crossfadeEmitter)
    incomingPlayer?.let { it.pause(); it.release() }
    incomingPlayer = null
    incomingPcmProcessor = null
    incomingTrackId = null
    incomingDurationSeconds = 0.0
    crossfadeProgressMs = 0L
    crossfadeDurationMs = 0L
    crossfadeStartPositionMs = 0L
    crossfadeBeatDurationMs = 0L
  }

  private fun cancelCrossfadeInternal() {
    handler.removeCallbacks(crossfadeEmitter)
    player?.volume = 1f
    discardIncomingPlayer()
  }

  private fun promoteIncomingPlayer() {
    handler.removeCallbacks(crossfadeEmitter)
    val outgoing = player ?: return cancelCrossfadeInternal()
    val incoming = incomingPlayer ?: return
    val promotedId = incomingTrackId ?: return cancelCrossfadeInternal()
    incoming.volume = 1f
    player = incoming
    pcmProcessor = incomingPcmProcessor
    LumaSharedPlayer.replace(incoming, incomingPcmProcessor!!)
    LumaMediaLibraryService.updatePlayer(incoming)
    activeTrackId = promotedId
    catalogDurationSeconds = incomingDurationSeconds
    lastError = null
    incomingPlayer = null
    incomingPcmProcessor = null
    incomingTrackId = null
    incomingDurationSeconds = 0.0
    crossfadeProgressMs = 0L
    crossfadeDurationMs = 0L
    outgoing.pause()
    outgoing.release()
    emitState(incoming)
    sendEvent("onCrossfadeComplete", mapOf("trackId" to promotedId))
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
      "playbackRate" to 1.0, "error" to lastError, "isEnded" to false, "decodedAudioFormat" to pcmProcessor?.getDecodedAudioFormat(),
      "estimatedBpm" to pcmProcessor?.getEstimatedBpm(),
      "incomingEstimatedBpm" to incomingPcmProcessor?.getEstimatedBpm()
    )
    val duration = current.duration.takeIf { it != C.TIME_UNSET && it > 0L }
      ?: (catalogDurationSeconds * 1000.0).toLong()
    return mapOf(
      "trackId" to activeTrackId,
      "isPlaying" to current.isPlaying,
      // ExoPlayer can briefly report IDLE between setMediaSource() and
      // entering BUFFERING. If playWhenReady is armed, keep the UI in its
      // loading state instead of presenting a false paused state.
      "isBuffering" to (
        current.playbackState == Player.STATE_BUFFERING ||
          (current.playWhenReady && current.playbackState == Player.STATE_IDLE)
      ),
      "positionSeconds" to current.currentPosition.coerceAtLeast(0L) / 1000.0,
      "durationSeconds" to duration / 1000.0,
      "bufferedSeconds" to current.bufferedPosition.coerceAtLeast(0L) / 1000.0,
      "playbackRate" to current.playbackParameters.speed.toDouble(),
      "error" to lastError,
      "isEnded" to (current.playbackState == Player.STATE_ENDED),
      "decodedAudioFormat" to pcmProcessor?.getDecodedAudioFormat(),
      "estimatedBpm" to pcmProcessor?.getEstimatedBpm(),
      "incomingEstimatedBpm" to incomingPcmProcessor?.getEstimatedBpm()
    )
  }

  private fun emitState(current: ExoPlayer) {
    if (!released.get()) sendEvent("onStateChange", stateMap(current))
  }

  /**
   * The MediaLibraryService owns the shared player's lifetime. Destroying the
   * React Native runtime must not tear down playback while Android Auto is active.
   */
  private fun detachModule() {
    if (!released.compareAndSet(false, true)) return
    handler.removeCallbacks(progressEmitter)
    LumaMediaLibraryService.setTrackRequestListener(null)
    LumaMediaLibraryService.setTransportControlListener(null)
    cancelCrossfadeInternal()
    player?.let { current -> sharedPlayerListener?.let(current::removeListener) }
    sharedPlayerListener = null
    player = null
    pcmProcessor = null
  }
}
