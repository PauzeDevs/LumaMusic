package dev.pauze.lumamusic.audio

import android.content.Context
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink

@UnstableApi
class LumaRenderersFactory(
  context: Context,
  private val pcmProcessor: LumaPcmAudioProcessor
) : DefaultRenderersFactory(context) {
  override fun buildAudioSink(
    context: Context,
    enableFloatOutput: Boolean,
    enableAudioOutputPlaybackParams: Boolean
  ): AudioSink {
    return DefaultAudioSink.Builder(context)
      .setEnableFloatOutput(enableFloatOutput)
      .setEnableAudioTrackPlaybackParams(enableAudioOutputPlaybackParams)
      .setAudioProcessors(arrayOf<AudioProcessor>(pcmProcessor))
      .build()
  }
}
