import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});async function callRegistrationRpc(token: string, preferences: NotificationPreferences) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/register_device_push_token`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_expo_push_token: token,
      p_platform: Platform.OS,
      p_new_music: preferences.newMusic,
      p_artist_releases: preferences.artistReleases,
      p_app_announcements: preferences.appAnnouncements
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notification registration failed (${response.status}): ${detail}`);
  }
}
export async function syncNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;
  await callRegistrationRpc(token, preferences);
}

