package dev.pauze.lumamusic.audio

import org.junit.Assert.assertEquals
import org.junit.Test

class LumaBeatAlignmentTest {
  @Test
  fun alignsToNextBeatBoundary() {
    assertEquals(500L, LumaBeatAlignment.nextBeatPositionMs(250L, 120))
    assertEquals(1000L, LumaBeatAlignment.nextBeatPositionMs(750L, 120))
  }

  @Test
  fun exactBeatAdvancesToFollowingBeat() {
    assertEquals(1000L, LumaBeatAlignment.nextBeatPositionMs(500L, 120))
  }

  @Test
  fun unknownTempoDoesNotDelayTransition() {
    assertEquals(750L, LumaBeatAlignment.nextBeatPositionMs(750L, null))
    assertEquals(750L, LumaBeatAlignment.nextBeatPositionMs(750L, 0))
  }
}
