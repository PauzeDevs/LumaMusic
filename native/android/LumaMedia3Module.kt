package dev.pauze.lumamusic.car

import android.content.ComponentName
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors

class LumaMedia3Module(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private var controller: MediaController? = null
    private var controllerFuture: ListenableFuture<MediaController>? = null

    override fun getName() = "LumaMedia3"

    @ReactMethod
    fun connect(promise: Promise) {
        ensureController(promise) { promise.resolve(true) }
    }

    @ReactMethod
    fun play(url: String, title: String, artist: String, promise: Promise) {
        if (!url.startsWith("https://")) {
            promise.reject("INVALID_STREAM_URL", "Media3 accepts HTTPS stream URLs only.")
            return
        }
        ensureController(promise) { mediaController ->
            val metadata = MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(artist)
                .setIsPlayable(true)
                .build()
            mediaController.setMediaItem(
                MediaItem.Builder().setUri(url).setMediaMetadata(metadata).build()
            )
            mediaController.prepare()
            mediaController.play()
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) = withController(promise) { it.pause(); promise.resolve(true) }

    @ReactMethod
    fun resume(promise: Promise) = withController(promise) { it.play(); promise.resolve(true) }

    @ReactMethod
    fun seekTo(seconds: Double, promise: Promise) =
        withController(promise) { it.seekTo((seconds.coerceAtLeast(0.0) * 1000).toLong()); promise.resolve(true) }

    @ReactMethod
    fun setSpeed(rate: Double, promise: Promise) =
        withController(promise) { it.setPlaybackSpeed(rate.coerceIn(0.5, 2.0).toFloat()); promise.resolve(true) }

    @ReactMethod
    fun getStatus(promise: Promise) = withController(promise) { mediaController ->
        val result = Arguments.createMap().apply {
            putBoolean("isPlaying", mediaController.isPlaying)
            putBoolean("isBuffering", mediaController.playbackState == androidx.media3.common.Player.STATE_BUFFERING)
            putDouble("position", mediaController.currentPosition.coerceAtLeast(0L) / 1000.0)
            putDouble("duration", mediaController.duration.takeIf { it >= 0L }?.div(1000.0) ?: 0.0)
            putString("error", null)
        }
        promise.resolve(result)
    }

    private fun withController(promise: Promise, action: (MediaController) -> Unit) {
        val existing = controller
        if (existing != null) action(existing)
        else ensureController(promise, action)
    }

    private fun ensureController(promise: Promise, action: (MediaController) -> Unit) {
        controller?.let { action(it); return }
        val pending = controllerFuture
        if (pending != null) {
            pending.addListener({
                try { controller = pending.get(); action(controller!!) }
                catch (error: Exception) { promise.reject("MEDIA3_CONNECT_FAILED", error) }
            }, MoreExecutors.directExecutor())
            return
        }
        val token = SessionToken(
            reactApplicationContext,
            ComponentName(reactApplicationContext, LumaMediaLibraryService::class.java)
        )
        val future = MediaController.Builder(reactApplicationContext, token).buildAsync()
        controllerFuture = future
        future.addListener({
            try {
                controller = future.get()
                action(controller!!)
            } catch (error: Exception) {
                controllerFuture = null
                promise.reject("MEDIA3_CONNECT_FAILED", error)
            }
        }, MoreExecutors.directExecutor())
    }

    override fun invalidate() {
        controller?.release()
        controller = null
        controllerFuture = null
        super.invalidate()
    }
}