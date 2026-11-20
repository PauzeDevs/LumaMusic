package dev.pauze.lumamusic.audio

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Equal-power volume envelope used while both Media3 decks are audible. */
internal object LumaCrossfadeCurve {
  fun levels(progress: Float): Pair<Float, Float> {
    val phase = progress.coerceIn(0f, 1f) * (PI.toFloat() / 2f)
    return cos(phase) to sin(phase)
  }
}
