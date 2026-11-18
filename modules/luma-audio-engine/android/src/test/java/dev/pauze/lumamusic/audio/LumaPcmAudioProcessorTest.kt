package dev.pauze.lumamusic.audio

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

@androidx.media3.common.util.UnstableApi
class LumaPcmAudioProcessorTest {
  @Test
  fun pcm16PassthroughPreservesSamplesWhenLabIsDisabled() {
    val processor = LumaPcmAudioProcessor()
    processor.setAudioLab(false, floatArrayOf(0f, 0f, 0f, 0f, 0f), 0f, false)
    processor.configure(AudioProcessor.AudioFormat(48_000, 2, C.ENCODING_PCM_16BIT))
    processor.flush()

    val input = ByteBuffer.allocateDirect(12).order(ByteOrder.nativeOrder())
      .putShort(8_192).putShort((-8_192).toShort())
      .putShort(16_384).putShort((-16_384).toShort())
      .putShort(Short.MIN_VALUE).putShort(Short.MAX_VALUE)
    input.flip()

    processor.queueInput(input)
    val output = processor.output
    assertEquals(12, output.remaining())
    assertEquals(8_192.toShort(), output.getShort())
    assertEquals((-8_192).toShort(), output.getShort())
    assertEquals(16_384.toShort(), output.getShort())
    assertEquals((-16_384).toShort(), output.getShort())
    assertEquals(Short.MIN_VALUE, output.getShort())
    assertEquals(Short.MAX_VALUE, output.getShort())
  }

  @Test
  fun rejectsNonPcm16OrFloatFormats() {
    val processor = LumaPcmAudioProcessor()
    assertThrows(AudioProcessor.UnhandledAudioFormatException::class.java) {
      processor.configure(AudioProcessor.AudioFormat(48_000, 2, C.ENCODING_PCM_8BIT))
    }
  }
}
