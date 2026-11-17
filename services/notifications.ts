import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const TOKEN_STORAGE_KEY = "lumamusic-expo-push-token";

export type NotificationPreferences = {
  newMusic: boolean;
  artistReleases: boolean;
  appAnnouncements: boolean;
};

function getSupabaseConfig() {
  const extra = Constants.expoConfig?.extra;
  const url = extra?.supabaseUrl as string | undefined;
  const key = extra?.supabasePublishableKey as string | undefined;
  if (!url || !key) throw new Error("Supabase notification configuration is missing.");
  return { url, key };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function callRegistrationRpc(token: string, preferences: NotificationPreferences): Promise<void> {
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

export async function registerForPushNotifications(
  preferences: NotificationPreferences
): Promise<string | null> {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("lumamusic-updates", {
      name: "LumaMusic updates",
      description: "New music, followed-artist releases and app announcements",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: "#F04455"
    });
  }

  const projectId = Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("Expo project ID is missing from the app configuration.");

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;
  await callRegistrationRpc(token, preferences);
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  return token;
}

export async function syncNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;
  await callRegistrationRpc(token, preferences);
}

export async function registerIfAlreadyAllowed(
  preferences: NotificationPreferences
): Promise<void> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) await registerForPushNotifications(preferences);
}
