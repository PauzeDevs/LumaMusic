import Foundation
import Accelerate

/// Independent LumaMusic DSP core. Accepts interleaved Float32 PCM.
final class PauzeAudioDsp {
    private let sampleRate: Double
    private let channels: Int
    private let frequencies: [Double] = [60, 250, 1_000, 4_000, 12_000]
    private var gains = [Double](repeating: 0, count: 5)
    private var targetGains = [Double](repeating: 0, count: 5)
    private var filters: [[Biquad]]
    private var preamp = 1.0
    private var targetPreamp = 1.0
    private var limiterEnabled = true
    private var limiterEnvelope = 0.0
    private let attack: Double
    private let release: Double
    private var equalizerEnabled = false
    private let lock = NSLock()

    init(sampleRate: Double, channels: Int) {
        precondition(sampleRate > 0 && channels >= 1 && channels <= 8)
        self.sampleRate = sampleRate
        self.channels = channels
        self.filters = Array(repeating: Array(repeating: Biquad(), count: 5), count: channels)
        self.attack = exp(-1.0 / (0.004 * sampleRate))
        self.release = exp(-1.0 / (0.080 * sampleRate))
    }

    func configureEqualizer(enabled: Bool, bandDb: [Float], preampDb: Float = 0) {
        guard bandDb.count == 5 else { return }
        lock.lock(); defer { lock.unlock() }
        equalizerEnabled = enabled
        targetGains = bandDb.map { enabled ? Double(max(-12, min(12, $0))) : 0 }
        targetPreamp = enabled ? pow(10, Double(max(-12, min(6, preampDb))) / 20) : 1
    }

    func setLimiterEnabled(_ enabled: Bool) {
        lock.lock(); defer { lock.unlock() }
        limiterEnabled = enabled
        if !enabled { limiterEnvelope = 0 }
    }

    /// Mutates interleaved PCM in place. The input must contain complete frames.
    func process(_ samples: inout [Float]) {
        guard !samples.isEmpty, samples.count % channels == 0 else { return }
        lock.lock(); defer { lock.unlock() }

        for band in 0..<5 { gains[band] += (targetGains[band] - gains[band]) * 0.35 }
        preamp += (targetPreamp - preamp) * 0.35

        let coefficients = (0..<5).map { index in
            Biquad.Coefficients.design(
                frequency: min(frequencies[index], sampleRate * 0.45),
                sampleRate: sampleRate,
                gainDb: gains[index],
                q: 1
            )
        }
        for channel in 0..<channels {
            for band in 0..<5 { filters[channel][band].coefficients = coefficients[band] }
        }

        var frame = 0
        while frame < samples.count {
            let base = frame
            var peak = 0.0
            for channel in 0..<channels {
                let index = base + channel
                var value = Double(samples[index]) * preamp
                if equalizerEnabled {
                    for band in 0..<5 { value = filters[channel][band].process(value) }
                }
                samples[index] = Float(value)
                peak = max(peak, abs(value))
            }
            if limiterEnabled {
                limiterEnvelope = peak > limiterEnvelope
                    ? attack * limiterEnvelope + (1 - attack) * peak
                    : release * limiterEnvelope + (1 - release) * peak
                let gain = limiterEnvelope > 0.98 ? 0.98 / limiterEnvelope : 1
                for channel in 0..<channels { samples[base + channel] *= Float(gain) }
            }
            frame += channels
        }
    }

    func reset() {
        lock.lock(); defer { lock.unlock() }
        for channel in 0..<channels {
            for band in 0..<5 { filters[channel][band].reset() }
        }
        limiterEnvelope = 0
    }
}

private final class Biquad {
    struct Coefficients {
        var b0 = 1.0, b1 = 0.0, b2 = 0.0, a1 = 0.0, a2 = 0.0

        static func design(frequency: Double, sampleRate: Double, gainDb: Double, q: Double) -> Coefficients {
            let a = pow(10, gainDb / 40)
            let w0 = 2 * Double.pi * frequency / sampleRate
            let alpha = sin(w0) / (2 * q)
            let cosine = cos(w0)
            let a0 = 1 + alpha / a
            return Coefficients(
                b0: (1 + alpha * a) / a0,
                b1: (-2 * cosine) / a0,
                b2: (1 - alpha * a) / a0,
                a1: (-2 * cosine) / a0,
                a2: (1 - alpha / a) / a0
            )
        }
    }

    var coefficients = Coefficients()
    private var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

    func process(_ input: Double) -> Double {
        let c = coefficients
        let output = c.b0 * input + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2
        x2 = x1; x1 = input; y2 = y1; y1 = output
        return output
    }

    func reset() { x1 = 0; x2 = 0; y1 = 0; y2 = 0 }
}
