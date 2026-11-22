package dev.pauze.lumamusic.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Keeps the app in Android's foreground-process priority class while the
 * native Luma ExoPlayer is actively playing. The audio engine remains the
 * source of truth for playback state.
 */
class LumaPlaybackForegroundService : Service() {
  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "LumaMusic playback",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Keeps audio playback active while you use other apps."
          setShowBadge(false)
        }
      )
    }
  }

  private fun buildNotification(): Notification {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    val appIcon = applicationInfo.icon
    return builder
      .setSmallIcon(if (appIcon != 0) appIcon else android.R.drawable.ic_media_play)
      .setContentTitle("LumaMusic")
      .setContentText("Audio is playing")
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()
  }

  companion object {
    const val ACTION_START = "dev.pauze.lumamusic.audio.action.START"
    const val ACTION_STOP = "dev.pauze.lumamusic.audio.action.STOP"
    private const val CHANNEL_ID = "lumamusic-playback"
    private const val NOTIFICATION_ID = 7101
  }
}
