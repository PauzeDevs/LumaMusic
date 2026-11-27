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
    fun allEffectsOffUsesExactDryBypass() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.configureEqualizer(false, floatArrayOf(0f, 0f, 0f, 0f, 0f), 0f)
        dsp.setLimiterEnabled(false)
        dsp.setAudioEffects("off", 0f)

        assertTrue(dsp.isBypassed())
        val input = floatArrayOf(0.1234567f, -0.7654321f, 0.999999f, -0.000001f)
        val expected = input.copyOf()
        dsp.process(input)

        assertTrue(input.contentEquals(expected))
    }

    @Test
    fun anyEnabledAudioEffectDisablesDryBypass() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.configureEqualizer(false, floatArrayOf(0f, 0f, 0f, 0f, 0f), 0f)
        dsp.setLimiterEnabled(true)
        dsp.setAudioEffects("off", 0f)
        assertTrue(!dsp.isBypassed())
    }

    @Test
    fun preampWorksIndependentlyOfEqualizer() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setLimiterEnabled(false)
        dsp.configureEqualizer(isEnabled = false, bandDb = floatArrayOf(0f, 0f, 0f, 0f, 0f), preampDb = 6f)
        var output = FloatArray(4_800) { 0.25f }
        repeat(12) {
            output = FloatArray(4_800) { 0.25f }
            dsp.process(output)
        }
        assertTrue(output[0] > 0.45f)
        assertTrue(output[0] < 0.52f)
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
    fun spatialBalanceChangesStereoChannelsWithoutBreakingLimiter() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setAudioEffects("off", 1f)
        val input = FloatArray(4_800) { if (it % 2 == 0) 0.5f else 0.5f }
        repeat(12) { dsp.process(input) }
        assertTrue(kotlin.math.abs(input[1]) > kotlin.math.abs(input[0]))
    }

    @Test
    fun reverbPresetProducesAStableFiniteTail() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setLimiterEnabled(false)
        dsp.setAudioEffects("room", 0f)
        val impulse = FloatArray(4_800)
        impulse[0] = 1f
        impulse[1] = 1f
        dsp.process(impulse)
        val tail = FloatArray(4_800)
        repeat(3) { dsp.process(tail) }
        assertTrue(tail.all { it.isFinite() })
        assertTrue(tail.any { kotlin.math.abs(it) > 0.00001f })
    }

    @Test
    fun nonFinitePcmIsSilencedWithoutPoisoningSubsequentAudio() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.configureEqualizer(isEnabled = true, bandDb = floatArrayOf(3f, 2f, 0f, -1f, 2f))
        dsp.setAudioEffects("room", 0f)
        repeat(8) {
            // process() mutates PCM in place, so use a fresh decoder block on
            // every iteration; otherwise the first pass replaces corrupt input
            // with silence and later passes no longer exercise sanitization.
            val damaged = floatArrayOf(Float.NaN, Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY, 0.2f)
            dsp.process(damaged)

            assertTrue(damaged.all { it.isFinite() })
            assertEquals(0f, damaged[0], 0f)
            assertEquals(0f, damaged[1], 0f)
            assertEquals(0f, damaged[2], 0f)
        }

        val recovery = FloatArray(4_800) { if (it % 2 == 0) 0.2f else -0.2f }
        repeat(8) { dsp.process(recovery) }
        assertTrue(recovery.all { it.isFinite() })
        assertTrue(recovery.any { kotlin.math.abs(it) > 0.01f })
    }

    @Test
    fun extremeFinitePcmRemainsFiniteAfterReverbAndStereoProcessing() {
        val dsp = PauzeAudioDsp(sampleRate = 48_000, channels = 2)
        dsp.setLimiterEnabled(false)
        dsp.setAudioEffects("hall", 0f)
        val extreme = FloatArray(9_600) { Float.MAX_VALUE }
        repeat(3) { dsp.process(extreme) }

        assertTrue(extreme.all { it.isFinite() })
        assertTrue(extreme.all { it >= 0f })
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
