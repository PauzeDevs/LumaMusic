package dev.pauze.lumamusic.audio.dsp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PauzeAudioDspTest {
    @Test
    fun disabledEqualizerAndLimiterPreserveQuietPcm() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setLimiterEnabled(false)
        dsp.configureEqualizer(isEnabled = false, bandDb = floatArrayOf(0f, 0f, 0f, 0f, 0f))
        val input = floatArrayOf(0.1f, -0.1f, 0.25f, -0.25f)
        val expected = input.copyOf()

        dsp.process(input)

        for (index in input.indices) assertEquals(expected[index], input[index], 0.00001f)
    }

    @Test
    fun limiterCatchesFirstTransientWithoutWaitingForAttackEnvelope() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setLimiterEnabled(true)
        val input = floatArrayOf(2f, -2f, 0.5f, -0.5f)

        dsp.process(input)

        assertTrue(input.all { it.isFinite() })
        assertTrue(input.all { kotlin.math.abs(it) <= 0.981f })
        assertEquals(0.98f, input[0], 0.002f)
        assertEquals(-0.98f, input[1], 0.002f)
    }

    @Test
    fun rejectsPartialInterleavedFrames() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        try {
            dsp.process(floatArrayOf(0.1f, 0.2f, 0.3f))
            throw AssertionError("Expected incomplete stereo frame to be rejected")
        } catch (_: IllegalArgumentException) {
            // Expected: processors must never consume half a stereo frame.
        }
    }

    @Test
    fun resetClearsFilterAndLimiterHistory() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.process(floatArrayOf(1f, 1f, 0f, 0f))
        dsp.reset()
        dsp.setLimiterEnabled(false)
        dsp.configureEqualizer(isEnabled = false, bandDb = floatArrayOf(0f, 0f, 0f, 0f, 0f))
        val silence = floatArrayOf(0f, 0f, 0f, 0f)

        dsp.process(silence)

        assertTrue(silence.all { it == 0f })
    }
}
