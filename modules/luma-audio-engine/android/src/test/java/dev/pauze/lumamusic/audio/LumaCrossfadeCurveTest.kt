package dev.pauze.lumamusic.audio

import org.junit.Assert.assertEquals
import org.junit.Test

class LumaCrossfadeCurveTest {
  @Test
  fun startsWithOutgoingDeckOnly() {
    val levels = LumaCrossfadeCurve.levels(0f)
    assertEquals(1f, levels.first, 0.0001f)
    assertEquals(0f, levels.second, 0.0001f)
  }

  @Test
  fun endsWithIncomingDeckOnly() {
    val levels = LumaCrossfadeCurve.levels(1f)
    assertEquals(0f, levels.first, 0.0001f)
    assertEquals(1f, levels.second, 0.0001f)
  }

  @Test
  fun midpointUsesEqualPowerGains() {
    val levels = LumaCrossfadeCurve.levels(0.5f)
    assertEquals(levels.first, levels.second, 0.0001f)
    assertEquals(1f, levels.first * levels.first + levels.second * levels.second, 0.0001f)
  }

  @Test
  fun clampsOutOfRangeProgress() {
    assertEquals(LumaCrossfadeCurve.levels(0f), LumaCrossfadeCurve.levels(-1f))
    assertEquals(LumaCrossfadeCurve.levels(1f), LumaCrossfadeCurve.levels(2f))
  }
}
