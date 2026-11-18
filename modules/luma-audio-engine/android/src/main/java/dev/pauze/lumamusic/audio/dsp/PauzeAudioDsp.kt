package dev.pauze.lumamusic.audio.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.pow
import kotlin.math.sin

/**
 * Allocation-conscious DSP core for LumaMusic.
 *
 * Input/output are interleaved Float32 PCM samples. Filter coefficient storage
 * and per-channel biquad state are allocated once; process() reuses them for
 * every decoded PCM block and never builds temporary arrays or coefficient
 * objects on the audio-processing path.
 */
class PauzeAudioDsp(sampleRate: Int, private val channels: Int) {
    init {
        require(sampleRate > 0) { "sampleRate must be positive" }
        require(channels in 1..8) { "channels must be between 1 and 8" }
    }

    private val rate = sampleRate.toDouble()
    private val frequencies = doubleArrayOf(60.0, 250.0, 1_000.0, 4_000.0, 12_000.0)
    private val gains = DoubleArray(frequencies.size)
    private val coefficients = Array(frequencies.size) { Coefficients() }
    private val filters = Array(channels) { Array(frequencies.size) { Biquad() } }
    private var preamp = 1.0
    private var limiterEnvelope = 0.0
    private val release = exp(-1.0 / (0.080 * rate))

    // UI/configuration writes publish immutable snapshots; the audio thread reads
    // one volatile reference per buffer and never waits on a configuration lock.
    @Volatile private var requestedConfig = DspConfig(
        equalizerEnabled = false,
        bandDb = FloatArray(frequencies.size),
        preampDb = 0f,
        limiterEnabled = false
    )

    fun configureEqualizer(isEnabled: Boolean, bandDb: FloatArray, preampDb: Float = 0f) {
        require(bandDb.size == frequencies.size) { "Exactly 5 EQ bands are required" }
        require(preampDb.isFinite()) { "Preamp must be finite" }
        require(bandDb.all { it.isFinite() }) { "EQ gains must be finite" }
        val current = requestedConfig
        requestedConfig = current.copy(
            equalizerEnabled = isEnabled,
            bandDb = bandDb.copyOf(),
            preampDb = preampDb.coerceIn(-12f, 6f)
        )
    }

    fun setLimiterEnabled(value: Boolean) {
        requestedConfig = requestedConfig.copy(limiterEnabled = value)
    }

    /** Process a complete interleaved Float32 PCM block in place. */
    fun process(samples: FloatArray, validSamples: Int = samples.size) {
        require(validSamples in 0..samples.size)
        require(validSamples % channels == 0) { "PCM block must contain complete frames" }
        if (validSamples == 0) return

        val config = requestedConfig
        for (band in gains.indices) {
            val requestedGain = if (config.equalizerEnabled) {
                config.bandDb[band].coerceIn(-12f, 12f).toDouble()
            } else {
                0.0
            }
            gains[band] += (requestedGain - gains[band]) * 0.35
            designPeaking(frequencies[band], gains[band], 1.0, coefficients[band])
        }

        val requestedPreamp = if (config.equalizerEnabled) dbToLinear(config.preampDb.toDouble()) else 1.0
        preamp += (requestedPreamp - preamp) * 0.35

        // Copy the reusable five-band design into each channel's independent
        // filter state. No Array or coefficient objects are created per block.
        for (channel in 0 until channels) {
            for (band in frequencies.indices) {
                filters[channel][band].set(coefficients[band])
            }
        }

        var index = 0
        while (index < validSamples) {
            var peak = 0.0
            for (channel in 0 until channels) {
                val sample = samples[index + channel].toDouble() * preamp
                var value = sample
                if (config.equalizerEnabled) {
                    for (band in frequencies.indices) value = filters[channel][band].process(value)
                }
                samples[index + channel] = value.toFloat()
                peak = maxOf(peak, abs(value))
            }

            if (config.limiterEnabled) {
                // Instantaneous attack prevents the first transient from escaping
                // above full scale; only gain recovery is smoothed.
                limiterEnvelope = if (peak >= limiterEnvelope) {
                    peak
                } else {
                    release * limiterEnvelope + (1.0 - release) * peak
                }
                val gain = if (limiterEnvelope > 0.98) 0.98 / limiterEnvelope else 1.0
                for (channel in 0 until channels) {
                    samples[index + channel] = (samples[index + channel] * gain).toFloat()
                }
            }
            index += channels
        }
    }

    fun reset() {
        filters.forEach { channelFilters -> channelFilters.forEach { it.reset() } }
        limiterEnvelope = 0.0
    }

    private fun designPeaking(frequency: Double, gainDb: Double, q: Double, output: Coefficients) {
        val a = 10.0.pow(gainDb / 40.0)
        val w0 = 2.0 * PI * frequency.coerceAtMost(rate * 0.45) / rate
        val alpha = sin(w0) / (2.0 * q)
        val cosW = cos(w0)
        val a0 = 1.0 + alpha / a
        output.b0 = (1.0 + alpha * a) / a0
        output.b1 = (-2.0 * cosW) / a0
        output.b2 = (1.0 - alpha * a) / a0
        output.a1 = (-2.0 * cosW) / a0
        output.a2 = (1.0 - alpha / a) / a0
    }

    private fun dbToLinear(db: Double) = 10.0.pow(db / 20.0)

    private data class DspConfig(
        val equalizerEnabled: Boolean,
        val bandDb: FloatArray,
        val preampDb: Float,
        val limiterEnabled: Boolean
    )

    private class Coefficients(
        var b0: Double = 1.0,
        var b1: Double = 0.0,
        var b2: Double = 0.0,
        var a1: Double = 0.0,
        var a2: Double = 0.0
    )

    private class Biquad {
        private var b0 = 1.0
        private var b1 = 0.0
        private var b2 = 0.0
        private var a1 = 0.0
        private var a2 = 0.0
        private var x1 = 0.0
        private var x2 = 0.0
        private var y1 = 0.0
        private var y2 = 0.0

        fun set(value: Coefficients) {
            b0 = value.b0
            b1 = value.b1
            b2 = value.b2
            a1 = value.a1
            a2 = value.a2
        }

        fun process(x: Double): Double {
            val y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1
            x1 = x
            y2 = y1
            y1 = y
            return y
        }

        fun reset() {
            x1 = 0.0
            x2 = 0.0
            y1 = 0.0
            y2 = 0.0
        }
    }
}
