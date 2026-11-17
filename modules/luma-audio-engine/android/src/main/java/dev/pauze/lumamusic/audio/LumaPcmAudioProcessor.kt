package dev.pauze.lumamusic.audio

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import dev.pauze.lumamusic.audio.dsp.PauzeAudioDsp
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.roundToInt

/**
 * Media3 decoded-PCM processor. It accepts PCM16 and PCM float and preserves
 * the input format. The DSP is applied after decoding and before AudioTrack.
 */
@androidx.media3.common.util.UnstableApi
class LumaPcmAudioProcessor : BaseAudioProcessor() {
  private var dsp: PauzeAudioDsp? = null
  private var scratch = FloatArray(0)
  private var equalizerEnabled = false
  private var bandDb = floatArrayOf(0f, 0f, 0f, 0f, 0f)
  private var preampDb = 0f
  private var limiterEnabled = true
  private var encoding = C.ENCODING_INVALID

  override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
    if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT &&
      inputAudioFormat.encoding != C.ENCODING_PCM_FLOAT
    ) {
      throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    }
    encoding = inputAudioFormat.encoding
    dsp = PauzeAudioDsp(inputAudioFormat.sampleRate, inputAudioFormat.channelCount).also {
      it.configureEqualizer(equalizerEnabled, bandDb, preampDb)
      it.setLimiterEnabled(limiterEnabled)
    }
    return inputAudioFormat
  }

  @Synchronized
  fun setAudioLab(enabled: Boolean, gainsDb: FloatArray, preamp: Float, limiter: Boolean) {
    require(gainsDb.size == 5) { "Exactly five EQ band values are required." }
    equalizerEnabled = enabled
    bandDb = gainsDb.copyOf()
    preampDb = preamp
    limiterEnabled = limiter
    dsp?.configureEqualizer(equalizerEnabled, bandDb, preampDb)
    dsp?.setLimiterEnabled(limiterEnabled)
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val bytes = inputBuffer.remaining()
    if (bytes == 0) return
    val bytesPerSample = if (encoding == C.ENCODING_PCM_FLOAT) 4 else 2
    val sampleCount = bytes / bytesPerSample
    val channels = inputAudioFormat.channelCount
    if (sampleCount == 0 || sampleCount % channels != 0) {
      inputBuffer.position(inputBuffer.limit())
      return
    }

    if (scratch.size < sampleCount) scratch = FloatArray(sampleCount)
    val source = inputBuffer.duplicate().order(ByteOrder.nativeOrder())
    val start = source.position()
    for (index in 0 until sampleCount) {
      scratch[index] = if (encoding == C.ENCODING_PCM_FLOAT) {
        source.getFloat()
      } else {
        source.getShort() / 32768f
      }
    }

    dsp?.process(scratch, sampleCount)

    val output = replaceOutputBuffer(bytes).order(ByteOrder.nativeOrder())
    for (index in 0 until sampleCount) {
      val value = scratch[index]
      if (encoding == C.ENCODING_PCM_FLOAT) {
        output.putFloat(value)
      } else {
        val pcm = (value.coerceIn(-1f, 1f) * 32767f).roundToInt().coerceIn(-32768, 32767)
        output.putShort(pcm.toShort())
      }
    }
    output.flip()
    inputBuffer.position(start + bytes)
  }

  override fun onFlush() {
    dsp?.reset()
  }

  override fun onReset() {
    dsp = null
    scratch = FloatArray(0)
    encoding = C.ENCODING_INVALID
  }
}
