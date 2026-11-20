package dev.pauze.lumamusic.audio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LumaBpmDetectorTest {
  @Test
  fun detectsRegular120BpmPulseTrain() {
    val detector = LumaBpmDetector(sampleRate = 1000)
    val samples = FloatArray(120_000)
    for (sample in samples.indices step 500) {
      for (offset in 0 until 40) {
        if (sample + offset < samples.size) samples[sample + offset] = 0.9f
      }
    }
    detector.accept(samples, samples.size, channels = 1)
    assertEquals(120, detector.bpm)
  }

  @Test
  fun doesNotInventTempoFromSilence() {
    val detector = LumaBpmDetector(sampleRate = 1000)
    detector.accept(FloatArray(120_000), 120_000, channels = 1)
    assertNull(detector.bpm)
  }

  @Test
  fun resetClearsPreviousTrackHistory() {
    val detector = LumaBpmDetector(sampleRate = 1000)
    val pulse = FloatArray(120_000)
    for (sample in pulse.indices step 500) {
      for (offset in 0 until 40) pulse[sample + offset] = 0.9f
    }
    detector.accept(pulse, pulse.size, channels = 1)
    assertEquals(120, detector.bpm)
    detector.reset()
    assertNull(detector.bpm)
  }
}
