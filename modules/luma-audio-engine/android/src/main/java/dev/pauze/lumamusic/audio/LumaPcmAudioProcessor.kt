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
  @Volatile private var dsp: PauzeAudioDsp? = null
  private var scratch = FloatArray(0)
  private var equalizerEnabled = false
  private var bandDb = floatArrayOf(0f, 0f, 0f, 0f, 0f)
  private var preampDb = 0f
  private var limiterEnabled = false
  private var reverbPreset = "off"
  private var spatialBalance = 0f
  private var encoding = C.ENCODING_INVALID
  private var decodedSampleRate = 0
  private var decodedChannelCount = 0

  @Synchronized
  override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
    if (inputAudioFormat.encoding != C.ENCODING_PCM_16BIT &&
      inputAudioFormat.encoding != C.ENCODING_PCM_FLOAT
    ) {
      throw AudioProcessor.UnhandledAudioFormatException(inputAudioFormat)
    }
    encoding = inputAudioFormat.encoding
    decodedSampleRate = inputAudioFormat.sampleRate
    decodedChannelCount = inputAudioFormat.channelCount
    dsp = PauzeAudioDsp(inputAudioFormat.sampleRate, inputAudioFormat.channelCount).also {
      it.configureEqualizer(equalizerEnabled, bandDb, preampDb)
      it.setLimiterEnabled(limiterEnabled)
      it.setAudioEffects(reverbPreset, spatialBalance)
    }
    return inputAudioFormat
  }

  @Synchronized
  fun setAudioLab(enabled: Boolean, gainsDb: FloatArray, preamp: Float, limiter: Boolean, reverb: String, balance: Float) {
    require(gainsDb.size == 5) { "Exactly five EQ band values are required." }
    equalizerEnabled = enabled
    bandDb = gainsDb.copyOf()
    preampDb = preamp
    limiterEnabled = limiter
    reverbPreset = reverb
    spatialBalance = balance
    dsp?.configureEqualizer(equalizerEnabled, bandDb, preampDb)
    dsp?.setLimiterEnabled(limiterEnabled)
    dsp?.setAudioEffects(reverbPreset, spatialBalance)
  }

  @Synchronized
  fun getDecodedAudioFormat(): Map<String, Any?>? {
    if (decodedSampleRate <= 0 || decodedChannelCount <= 0) return null
    val isFloat = encoding == C.ENCODING_PCM_FLOAT
    return mapOf(
      "sampleRateHz" to decodedSampleRate,
      "channelCount" to decodedChannelCount,
      "pcmEncoding" to if (isFloat) "PCM_FLOAT" else "PCM_16BIT",
      "bitDepth" to if (isFloat) 32 else 16
    )
  }

  override fun queueInput(inputBuffer: ByteBuffer) {
    val bytes = inputBuffer.remaining()
    if (bytes == 0) return
    val bytesPerSample = if (encoding == C.ENCODING_PCM_FLOAT) 4 else 2
    val sampleCount = bytes / bytesPerSample
    val channels = inputAudioFormat.channelCount
    require(bytes % bytesPerSample == 0 && sampleCount > 0 && sampleCount % channels == 0) {
      "PCM buffer must contain complete interleaved frames."
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
        // PCM16 decode uses 32768 as its scale; use the same scale on encode
        // so negative samples (including Short.MIN_VALUE) round-trip exactly.
        val pcm = (value.coerceIn(-1f, 1f) * 32768f).roundToInt().coerceIn(-32768, 32767)
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
    decodedSampleRate = 0
    decodedChannelCount = 0
  }
}
