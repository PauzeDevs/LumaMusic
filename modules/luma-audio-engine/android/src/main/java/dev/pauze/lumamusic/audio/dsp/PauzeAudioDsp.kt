package dev.pauze.lumamusic.audio.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Standalone, allocation-conscious DSP core for LumaMusic.
 *
 * Input/output are interleaved Float32 PCM samples. This class deliberately
 * does not depend on Mochy Music source code or Android framework classes.
 * A native player adapter is responsible for feeding decoded PCM buffers.
 */
class PauzeAudioDsp(sampleRate: Int, private val channels: Int) {
    init {
        require(sampleRate > 0) { "sampleRate must be positive" }
        require(channels in 1..8) { "channels must be between 1 and 8" }
    }

    private val rate = sampleRate.toDouble()
    private val frequencies = doubleArrayOf(60.0, 250.0, 1_000.0, 4_000.0, 12_000.0)
    private val gains = DoubleArray(frequencies.size)
    private val targetGains = DoubleArray(frequencies.size)
    private val filters = Array(channels) { Array(frequencies.size) { Biquad() } }
    private var preamp = 1.0
    private var targetPreamp = 1.0
    private var limiterEnabled = true
    private var limiterEnvelope = 0.0
    private val attack = exp(-1.0 / (0.004 * rate))
    private val release = exp(-1.0 / (0.080 * rate))
    private var enabled = false

    @Synchronized
    fun configureEqualizer(isEnabled: Boolean, bandDb: FloatArray, preampDb: Float = 0f) {
        require(bandDb.size == frequencies.size) { "Exactly 5 EQ bands are required" }
        enabled = isEnabled
        for (i in bandDb.indices) targetGains[i] = if (isEnabled) bandDb[i].coerceIn(-12f, 12f).toDouble() else 0.0
        targetPreamp = if (isEnabled) dbToLinear(preampDb.coerceIn(-12f, 6f).toDouble()) else 1.0
    }

    @Synchronized
    fun setLimiterEnabled(value: Boolean) {
        limiterEnabled = value
        if (!value) limiterEnvelope = 0.0
    }

    /** Process a complete interleaved Float32 PCM block in place. */
    @Synchronized
    fun process(samples: FloatArray, validSamples: Int = samples.size) {
        require(validSamples in 0..samples.size)
        require(validSamples % channels == 0) { "PCM block must contain complete frames" }
        if (validSamples == 0) return

        // Smooth parameter changes at block boundaries to avoid zipper noise.
        for (band in gains.indices) {
            gains[band] += (targetGains[band] - gains[band]) * 0.35
        }
        preamp += (targetPreamp - preamp) * 0.35

        val coefficients = Array(frequencies.size) { band ->
            designPeaking(frequencies[band], gains[band], 1.0)
        }
        for (channel in 0 until channels) {
            for (band in frequencies.indices) filters[channel][band].set(coefficients[band])
        }

        var index = 0
        while (index < validSamples) {
            var peak = 0.0
            for (channel in 0 until channels) {
                val sample = samples[index + channel].toDouble() * preamp
                var value = sample
                if (enabled) {
                    for (band in frequencies.indices) value = filters[channel][band].process(value)
                }
                samples[index + channel] = value.toFloat()
                peak = maxOf(peak, abs(value))
            }

            if (limiterEnabled) {
                limiterEnvelope = if (peak > limiterEnvelope) {
                    attack * limiterEnvelope + (1.0 - attack) * peak
                } else {
                    release * limiterEnvelope + (1.0 - release) * peak
                }
                val gain = if (limiterEnvelope > 0.98) 0.98 / limiterEnvelope else 1.0
                for (channel in 0 until channels) samples[index + channel] = (samples[index + channel] * gain).toFloat()
            }
            index += channels
        }
    }

    @Synchronized
    fun reset() {
        filters.forEach { channelFilters -> channelFilters.forEach { it.reset() } }
        limiterEnvelope = 0.0
    }

    private fun designPeaking(frequency: Double, gainDb: Double, q: Double): Coefficients {
        val a = 10.0.pow(gainDb / 40.0)
        val w0 = 2.0 * PI * frequency.coerceAtMost(rate * 0.45) / rate
        val alpha = sin(w0) / (2.0 * q)
        val cosW = cos(w0)
        val a0 = 1.0 + alpha / a
        return Coefficients(
            (1.0 + alpha * a) / a0,
            (-2.0 * cosW) / a0,
            (1.0 - alpha * a) / a0,
            (-2.0 * cosW) / a0,
            (1.0 - alpha / a) / a0
        )
    }

    private fun dbToLinear(db: Double) = 10.0.pow(db / 20.0)

    private data class Coefficients(val b0: Double, val b1: Double, val b2: Double, val a1: Double, val a2: Double)

    private class Biquad {
        private var c = Coefficients(1.0, 0.0, 0.0, 0.0, 0.0)
        private var x1 = 0.0
        private var x2 = 0.0
        private var y1 = 0.0
        private var y2 = 0.0

        fun set(value: Coefficients) { c = value }
        fun process(x: Double): Double {
            val y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            return y
        }
        fun reset() { x1 = 0.0; x2 = 0.0; y1 = 0.0; y2 = 0.0 }
    }
}
