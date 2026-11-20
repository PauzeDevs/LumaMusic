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
 * Input/output are interleaved Float32 PCM samples. Filter coefficients,
 * reverb delay lines and per-channel filter state are allocated once. process()
 * reuses them for every decoded PCM block.
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
    private val delayLengths = doubleArrayOf(29.7, 37.1, 41.1, 43.7).map { (rate * it / 1000.0).toInt().coerceAtLeast(1) }.toIntArray()
    private val reverbLines = Array(2) { Array(4) { line -> FloatArray(delayLengths[line]) } }
    private val reverbIndices = Array(2) { IntArray(4) }
    private val reverbDamped = Array(2) { DoubleArray(4) }
    private var preamp = 1.0
    private var limiterEnvelope = 0.0
    private var reverbWet = 0.0
    private var reverbFeedback = 0.55
    private var spatialBalance = 0.0
    private var bypassResetApplied = false
    private val release = exp(-1.0 / (0.080 * rate))

    @Volatile private var requestedConfig = DspConfig(
        equalizerEnabled = false,
        bandDb = FloatArray(frequencies.size),
        preampDb = 0f,
        limiterEnabled = false,
        reverbPreset = "off",
        spatialBalance = 0f
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

    fun setAudioEffects(reverbPreset: String, balance: Float) {
        require(reverbPreset in setOf("off", "room", "studio", "hall")) { "Unsupported reverb preset" }
        require(balance.isFinite()) { "Spatial balance must be finite" }
        requestedConfig = requestedConfig.copy(
            reverbPreset = reverbPreset,
            spatialBalance = balance.coerceIn(-1f, 1f)
        )
    }

    /** Process a complete interleaved Float32 PCM block in place. */
    fun process(samples: FloatArray, validSamples: Int = samples.size) {
        require(validSamples in 0..samples.size)
        require(validSamples % channels == 0) { "PCM block must contain complete frames" }
        if (validSamples == 0) return

        val config = requestedConfig
        if (isBypassed(config)) {
            if (!bypassResetApplied) reset()
            bypassResetApplied = true
            return
        }
        bypassResetApplied = false
        for (band in gains.indices) {
            val requestedGain = if (config.equalizerEnabled) {
                config.bandDb[band].coerceIn(-12f, 12f).toDouble()
            } else 0.0
            gains[band] += (requestedGain - gains[band]) * 0.35
            designPeaking(frequencies[band], gains[band], 1.0, coefficients[band])
        }

        val requestedPreamp = dbToLinear(config.preampDb.toDouble())
        preamp += (requestedPreamp - preamp) * 0.35

        val requestedWet = when (config.reverbPreset) {
            "room" -> 0.16
            "studio" -> 0.22
            "hall" -> 0.30
            else -> 0.0
        }
        val requestedFeedback = when (config.reverbPreset) {
            "room" -> 0.56
            "studio" -> 0.68
            "hall" -> 0.76
            else -> 0.55
        }
        reverbWet += (requestedWet - reverbWet) * 0.35
        reverbFeedback += (requestedFeedback - reverbFeedback) * 0.2
        spatialBalance += (config.spatialBalance.toDouble() - spatialBalance) * 0.35
        val leftGain = if (spatialBalance > 0.0) cos(spatialBalance * PI / 2.0) else 1.0
        val rightGain = if (spatialBalance < 0.0) cos(-spatialBalance * PI / 2.0) else 1.0

        for (channel in 0 until channels) {
            for (band in frequencies.indices) filters[channel][band].set(coefficients[band])
        }

        var index = 0
        while (index < validSamples) {
            var peak = 0.0
            for (channel in 0 until channels) {
                // Decoders should produce finite normalized PCM, but malformed or
                // damaged frames must never poison filter history or the output track.
                val rawSample = samples[index + channel]
                if (!rawSample.isFinite()) {
                    // A corrupt frame must not leak a previous filter tail into
                    // the damaged output sample or leave state for later frames.
                    filters[channel].forEach { it.reset() }
                    if (channel < reverbLines.size) resetReverbChannel(channel)
                    samples[index + channel] = 0f
                } else {
                    var value = rawSample.toDouble() * preamp
                    if (config.equalizerEnabled) {
                        for (band in frequencies.indices) value = filters[channel][band].process(value)
                    }
                    samples[index + channel] = if (value.isFinite() && value <= Float.MAX_VALUE && value >= -Float.MAX_VALUE) {
                        value.toFloat()
                    } else {
                        filters[channel].forEach { it.reset() }
                        0f
                    }
                }
            }

            if (channels >= 2) {
                var left = samples[index].toDouble()
                var right = samples[index + 1].toDouble()
                if (reverbWet > 0.0001) {
                    left += processReverb(0, left) * reverbWet
                    right += processReverb(1, right) * reverbWet
                }
                left *= leftGain
                right *= rightGain
                samples[index] = finiteFloat(left)
                samples[index + 1] = finiteFloat(right)
            }

            // Reverb and stereo processing happen after the first sample guard.
            // Sanitize once more here so extreme but finite PCM cannot overflow
            // Float32 when converted back to the Media3 output buffer.
            for (channel in 0 until channels) {
                if (!samples[index + channel].isFinite()) samples[index + channel] = 0f
                peak = maxOf(peak, abs(samples[index + channel].toDouble()))
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

    /** True when the configured signal path must be bit-transparent. */
    fun isBypassed(): Boolean = isBypassed(requestedConfig)

    private fun isBypassed(config: DspConfig): Boolean =
        !config.equalizerEnabled &&
            config.preampDb == 0f &&
            !config.limiterEnabled &&
            config.reverbPreset == "off" &&
            config.spatialBalance == 0f

    private fun resetReverbChannel(channel: Int) {
        for (line in 0 until 4) {
            reverbLines[channel][line].fill(0f)
            reverbIndices[channel][line] = 0
            reverbDamped[channel][line] = 0.0
        }
    }

    private fun processReverb(channel: Int, input: Double): Double {
        var sum = 0.0
        for (line in 0 until 4) {
            val index = reverbIndices[channel][line]
            val stored = reverbLines[channel][line][index].toDouble()
            val delayed = if (stored.isFinite()) stored else 0.0
            val previousDamped = if (reverbDamped[channel][line].isFinite()) reverbDamped[channel][line] else 0.0
            val damped = previousDamped + (delayed - previousDamped) * 0.22
            reverbDamped[channel][line] = damped
            val feedbackSample = input + damped * reverbFeedback
            reverbLines[channel][line][index] = finiteFloat(feedbackSample)
            reverbIndices[channel][line] = if (index + 1 == reverbLines[channel][line].size) 0 else index + 1
            sum += delayed
        }
        return sum * 0.25
    }

    fun reset() {
        filters.forEach { channelFilters -> channelFilters.forEach { it.reset() } }
        for (channel in 0..1) {
            for (line in 0 until 4) {
                reverbLines[channel][line].fill(0f)
                reverbIndices[channel][line] = 0
                reverbDamped[channel][line] = 0.0
            }
        }
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

    private fun finiteFloat(value: Double): Float {
        if (!value.isFinite()) return 0f
        return value.coerceIn(-Float.MAX_VALUE.toDouble(), Float.MAX_VALUE.toDouble()).toFloat()
    }

    private fun dbToLinear(db: Double) = 10.0.pow(db / 20.0)

    private data class DspConfig(
        val equalizerEnabled: Boolean,
        val bandDb: FloatArray,
        val preampDb: Float,
        val limiterEnabled: Boolean,
        val reverbPreset: String,
        val spatialBalance: Float
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
            if (!x.isFinite()) {
                reset()
                return 0.0
            }
            val y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            if (!y.isFinite()) {
                reset()
                return 0.0
            }
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
