package dev.pauze.lumamusic.audio

/** Small, deterministic beat-grid helper. */
internal object LumaBeatAlignment {
  /**
   * Returns the next beat boundary after [positionMs]. Invalid/unknown tempo
   * or invalid position falls back to the current position (no added delay).
   */
  fun nextBeatPositionMs(positionMs: Long, bpm: Int?): Long {
    if (positionMs < 0L || bpm == null || bpm !in 60..180) return positionMs.coerceAtLeast(0L)
    val beatMs = 60_000.0 / bpm
    return (kotlin.math.floor(positionMs / beatMs) + 1.0).let { (it * beatMs).toLong() }
  }
}
