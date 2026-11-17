import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import * as Notifications from "expo-notifications";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ComponentProps } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotificationPreferences } from "../store/notificationPreferences";
import { registerForPushNotifications, syncNotificationPreferences } from "../services/notifications";
import { useTheme } from "../theme/useTheme";

type PermissionState = "loading" | "granted" | "denied" | "undetermined";

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [permission, setPermission] = useState<PermissionState>("loading");
  const [requesting, setRequesting] = useState(false);
  const artistReleases = useNotificationPreferences((state) => state.artistReleases);
  const newMusic = useNotificationPreferences((state) => state.newMusic);
  const appAnnouncements = useNotificationPreferences((state) => state.appAnnouncements);
  const setArtistReleases = useNotificationPreferences((state) => state.setArtistReleases);
  const setNewMusic = useNotificationPreferences((state) => state.setNewMusic);
  const setAppAnnouncements = useNotificationPreferences((state) => state.setAppAnnouncements);

  const refreshPermission = useCallback(async () => {
    try {
      const current = await Notifications.getPermissionsAsync();
      setPermission(current.granted ? "granted" : current.canAskAgain ? "undetermined" : "denied");
    } catch {
      setPermission("denied");
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshPermission();
  }, [refreshPermission]));

  const enableNotifications = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("lumamusic-updates", {
          name: "LumaMusic updates",
          description: "New music, followed-artist releases and app announcements",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 180, 100, 180],
          lightColor: colors.accent
        });
      }
      const current = await Notifications.getPermissionsAsync();
      const result = current.granted ? current : await Notifications.requestPermissionsAsync();
      setPermission(result.granted ? "granted" : result.canAskAgain ? "undetermined" : "denied");
      if (result.granted) {
        const state = useNotificationPreferences.getState();
        await registerForPushNotifications({ newMusic: state.newMusic, artistReleases: state.artistReleases, appAnnouncements: state.appAnnouncements });
      }
      if (!result.granted && !result.canAskAgain) {
        Alert.alert("Notifications are disabled", "Allow LumaMusic notifications in your device settings to receive alerts.", [
          { text: "Not now", style: "cancel" },
          { text: "Open settings", onPress: () => { void Linking.openSettings(); } }
        ]);
      }
    } catch (error) {
      Alert.alert("Couldn't enable notifications", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  const statusLabel = permission === "loading" ? "Checking permission…" :
    permission === "granted" ? "Allowed on this device" :
    permission === "denied" ? "Blocked in device settings" : "Permission not requested";

  const SettingRow = ({ icon, title, description, value, onChange }: {
    icon: ComponentProps<typeof Ionicons>["name"]; title: string; description: string;
    value: boolean; onChange: (next: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}><Ionicons name={icon} size={19} color={colors.accent} /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.surfaceSoft, true: colors.accent }} thumbColor="#FFFFFF" />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>STAY IN THE LOOP</Text>
          <Text style={styles.title}>Notifications</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}><Ionicons name="notifications-outline" size={23} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.permissionTitle}>{permission === "granted" ? "Notifications are allowed" : "Turn on notifications"}</Text>
            <Text style={styles.permissionDescription}>{statusLabel}</Text>
          </View>
          {permission === "granted" ? <Ionicons name="checkmark-circle" size={22} color={colors.mint} /> : null}
          {permission !== "granted" ? (
            <Pressable disabled={requesting || permission === "loading"} onPress={enableNotifications} style={styles.enableButton}>
              <Text style={styles.enableText}>{requesting ? "Please wait…" : permission === "denied" ? "Settings" : "Enable"}</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>YOUR MUSIC</Text>
        <View style={styles.group}>
          <SettingRow icon="disc-outline" title="New music" description="Highlights and newly added music" value={newMusic} onChange={(enabled) => { void updatePreference("newMusic", enabled); }} />
          <View style={styles.separator} />
          <SettingRow icon="person-outline" title="Followed artists" description="New releases from artists you follow" value={artistReleases} onChange={(enabled) => { void updatePreference("artistReleases", enabled); }} />
        </View>

        <Text style={styles.sectionTitle}>FROM LUMAMUSIC</Text>
        <View style={styles.group}>
          <SettingRow icon="megaphone-outline" title="App announcements" description="Important news, features and app updates" value={appAnnouncements} onChange={(enabled) => { void updatePreference("appAnnouncements", enabled); }} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={19} color={colors.muted} />
          <Text style={styles.infoText}>Your preferences sync to LumaMusic's notification service. Remote alerts are sent when new music or app announcements are published.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: "center", justifyContent: "center" },
    eyebrow: { color: c.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
    title: { color: c.text, fontSize: 25, fontWeight: "800", marginTop: 2 },
    content: { padding: 20, paddingBottom: 40, gap: 12 },
    permissionCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 15, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: 15 },
    permissionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    permissionTitle: { color: c.text, fontSize: 12, fontWeight: "800" },
    permissionDescription: { color: c.muted, fontSize: 10, marginTop: 4 },
    enableButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: c.accent },
    enableText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
    sectionTitle: { color: c.subtle, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginTop: 8, marginBottom: 1 },
    group: { borderRadius: 18, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border, paddingHorizontal: 13 },
    settingRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 11 },
    settingIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    settingCopy: { flex: 1 },
    settingTitle: { color: c.text, fontSize: 12, fontWeight: "700" },
    settingDescription: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 49 },
    infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 15, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginTop: 9 },
    infoText: { color: c.muted, flex: 1, fontSize: 10, lineHeight: 16 }
  });
}
