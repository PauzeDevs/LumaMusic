package dev.pauze.lumamusic.audio

import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Estimates tempo from short-term PCM energy. This is deliberately conservative:
 * it reports a BPM only when the onset envelope has a sufficiently strong,
 * repeatable periodicity. It is not a beat tracker or a substitute for metadata.
 */
internal class LumaBpmDetector(
  private val sampleRate: Int,
  private val frameMillis: Int = 100,
  private val historySeconds: Int = 12
) {
  private val frameSamples = (sampleRate * frameMillis / 1000).coerceAtLeast(1)
  private val energyHistory = ArrayList<Float>()
  private var accumulated = 0.0
  private var samplesInFrame = 0

  val bpm: Int?
    get() = estimate()

  fun accept(samples: FloatArray, sampleCount: Int, channels: Int) {
    if (sampleRate <= 0 || channels <= 0) return
    var index = 0
    while (index + channels <= sampleCount) {
      var monoEnergy = 0.0
      for (channel in 0 until channels) {
        val value = samples[index + channel].toDouble()
        monoEnergy += value * value
      }
      accumulated += monoEnergy / channels
      samplesInFrame++
      index += channels
      if (samplesInFrame >= frameSamples) {
        energyHistory.add(sqrt(accumulated / samplesInFrame).toFloat())
        val maxFrames = historySeconds * 1000 / frameMillis
        while (energyHistory.size > maxFrames) energyHistory.removeAt(0)
        accumulated = 0.0
        samplesInFrame = 0
      }
    }
  }

  fun reset() {
    energyHistory.clear()
    accumulated = 0.0
    samplesInFrame = 0
  }

  private fun estimate(): Int? {
    if (energyHistory.size < 80) return null
    val envelope = FloatArray(energyHistory.size)
    val mean = energyHistory.average().toFloat()
    for (i in energyHistory.indices) {
      envelope[i] = (energyHistory[i] - mean).coerceAtLeast(0f)
    }
    val minLag = (60000.0 / 180.0 / frameMillis).toInt()
    val maxLag = (60000.0 / 60.0 / frameMillis).toInt()
    var bestLag = 0
    var bestScore = 0.0
    var secondScore = 0.0
    for (lag in minLag..maxLag) {
      var score = 0.0
      var normA = 0.0
      var normB = 0.0
      for (i in lag until envelope.size) {
        val a = envelope[i].toDouble()
        val b = envelope[i - lag].toDouble()
        score += a * b
        normA += a * a
        normB += b * b
      }
      val normalized = if (normA > 0.0 && normB > 0.0) score / sqrt(normA * normB) else 0.0
      if (normalized > bestScore) {
        secondScore = bestScore
        bestScore = normalized
        bestLag = lag
      } else if (normalized > secondScore) {
        secondScore = normalized
      }
    }
    if (bestLag == 0 || bestScore < 0.22 || bestScore - secondScore < 0.015) return null
    val raw = 60000.0 / (bestLag * frameMillis)
    val candidates = listOf(raw, raw * 2.0, raw / 2.0).filter { it in 60.0..180.0 }
    return candidates.minByOrNull { abs(it - 120.0) }?.toInt()
  }
}
