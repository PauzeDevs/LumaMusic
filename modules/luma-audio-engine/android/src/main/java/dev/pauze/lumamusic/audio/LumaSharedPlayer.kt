package dev.pauze.lumamusic.audio

import android.content.Context
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

/** Process-wide ExoPlayer shared by the app module and Android Auto service. */
@UnstableApi
internal object LumaSharedPlayer {
  @Volatile private var sharedPlayer: ExoPlayer? = null
  @Volatile private var sharedProcessor: LumaPcmAudioProcessor? = null

  @Synchronized
  fun getOrCreate(context: Context): ExoPlayer {
    sharedPlayer?.let { return it }
    val appContext = context.applicationContext
    val processor = LumaPcmAudioProcessor()
    val created = ExoPlayer.Builder(appContext, LumaRenderersFactory(appContext, processor))
      .setLooper(Looper.getMainLooper())
      .build()
      .apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build(),
          true
        )
      }
    sharedProcessor = processor
    sharedPlayer = created
    return created
  }

  fun processor(): LumaPcmAudioProcessor =
    sharedProcessor ?: throw IllegalStateException("Shared audio processor is not initialized.")

  @Synchronized
  fun release() {
    sharedPlayer?.release()
    sharedPlayer = null
    sharedProcessor = null
  }
}
