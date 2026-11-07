import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { useAudioEngine } from "../../providers/AudioPlayerProvider";
import { usePlayerStore } from "../../store/player";
import { colors } from "../../theme/colors";

const settings = [
  { icon: "person-outline", title: "Account", subtitle: "Your local LumaMusic profile" },
  { icon: "notifications-outline", title: "Notifications", subtitle: "On-device notification preference" },
  { icon: "color-palette-outline", title: "Appearance", subtitle: "Dark matte · Silver glass" },
  { icon: "musical-notes-outline", title: "Playback", subtitle: "Playback speed and audio source" },
  { icon: "shield-checkmark-outline", title: "Privacy", subtitle: "Your data and listening activity" },
  { icon: "information-circle-outline", title: "About LumaMusic", subtitle: "Version 0.1.0 · PauzeDevs" }
] as const;

export default function ProfileScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const { setPlaybackRate } = useAudioEngine();
  const [activeSetting, setActiveSetting] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Music listener");
  const [nameDraft, setNameDraft] = useState("Music listener");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem("@lumamusic/display-name"),
      AsyncStorage.getItem("@lumamusic/notifications-enabled")
    ]).then(([savedName, savedNotifications]) => {
      if (!mounted) return;
      if (savedName?.trim()) {
        setDisplayName(savedName.trim());
        setNameDraft(savedName.trim());
      }
      setNotificationsEnabled(savedNotifications === "true");
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const saveDisplayName = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) return;
    try {
      await AsyncStorage.setItem("@lumamusic/display-name", nextName);
      setDisplayName(nextName);
      setActiveSetting(null);
    } catch {
      setNameDraft(displayName);
    }
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;
    try {
      await AsyncStorage.setItem("@lumamusic/notifications-enabled", String(next));
      setNotificationsEnabled(next);
    } catch {
      // Keep the current setting if persistence fails.
    }
  };

  const openSetting = (title: string) => {
    if (title === "Account") setNameDraft(displayName);
    setActiveSetting(title);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}>
        <View style={styles.topline}><View style={styles.liveDot} /><Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text></View>
        <Text style={styles.title}>Made for you.</Text>
        <Text style={styles.intro}>Your music world, tuned to your taste.</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.handle}>Your LumaMusic profile · This device</Text>
          </View>
          <View style={styles.profileBadge}><Ionicons name="person" size={13} color={colors.accent} /></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your listening</Text><Text style={styles.sectionMeta}>NOW</Text></View>
        <View style={styles.nowCard}>
          <View style={styles.nowIcon}><Ionicons name="musical-notes" size={20} color={colors.accent} /></View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.nowTitle}>{currentTrack ? currentTrack.title : "Nothing playing right now"}</Text>
            <Text numberOfLines={1} style={styles.nowSub}>{currentTrack ? (currentTrack.artistCredited === false ? "Uploader credit" : currentTrack.artist) + " · Audius stream" : "Pick a track and let the room fill up."}</Text>
          </View>
          <View style={[styles.statusPill, currentTrack && styles.statusPillActive]}><Text style={styles.statusText}>{currentTrack ? "READY" : "IDLE"}</Text></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Preferences</Text><Text style={styles.sectionMeta}>PERSONALISE</Text></View>
        <View style={styles.settings}>
          {settings.map((item, index) => (
            <Pressable key={item.title} onPress={() => openSetting(item.title)} style={[styles.setting, index === settings.length - 1 && styles.last]} android_ripple={{ color: "rgba(235,239,245,0.06)" }}>
              <View style={styles.settingIcon}><Ionicons name={item.icon} size={19} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
        <View style={styles.footerCard}>
          <Ionicons name="musical-notes" size={16} color={colors.accent} />
          <Text style={styles.footer}>Made for the love of listening.{"\n"}LumaMusic by PauzeDevs</Text>
        </View>
      </ScrollView>

      <Modal visible={activeSetting !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setActiveSetting(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalEyebrow}>LUMAMUSIC SETTINGS</Text>
              <Pressable onPress={() => setActiveSetting(null)} hitSlop={12}><Ionicons name="close" size={21} color={colors.muted} /></Pressable>
            </View>
            <Text style={styles.modalTitle}>{activeSetting}</Text>

            {activeSetting === "Account" ? <>
              <Text style={styles.modalBody}>Choose the name shown on your local profile. It is saved on this device and does not require an online account.</Text>
              <TextInput value={nameDraft} onChangeText={setNameDraft} maxLength={32} placeholder="Your display name" placeholderTextColor={colors.subtle} style={styles.modalInput} />
              <Pressable style={styles.primaryAction} onPress={() => void saveDisplayName()}><Text style={styles.primaryActionText}>Save name</Text></Pressable>
            </> : null}

            {activeSetting === "Playback" ? <>
              <Text style={styles.modalBody}>Audius controls the stream quality. LumaMusic cannot offer a bitrate selector for this source yet. Playback speed is connected to the audio engine.</Text>
              <View style={styles.speedOptions}>
                {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                  <Pressable key={rate} onPress={() => setPlaybackRate(rate)} style={[styles.speedOption, playbackRate === rate && styles.speedOptionActive]}>
                    <Text style={[styles.speedText, playbackRate === rate && styles.speedTextActive]}>{rate}×</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.modalFootnote}>Current playback speed: {playbackRate}×</Text>
            </> : null}

            {activeSetting === "Appearance" ? <>
              <Text style={styles.modalBody}>Dark Matte is the active appearance: near-black backgrounds, graphite panels, restrained native blur and neutral silver highlights. No purple accent theme is applied.</Text>
              <View style={styles.appearancePreview}><View style={styles.previewSwatch} /><View style={{ flex: 1 }}><Text style={styles.previewTitle}>Dark Matte</Text><Text style={styles.previewSub}>Currently active</Text></View><Ionicons name="checkmark-circle" size={20} color={colors.accent} /></View>
            </> : null}

            {activeSetting === "Notifications" ? <>
              <Text style={styles.modalBody}>This switch stores your preference on this device only. Push notification delivery is not configured in this build, so enabling it will not send alerts.</Text>
              <Pressable onPress={() => void toggleNotifications()} style={[styles.preferenceToggle, notificationsEnabled && styles.preferenceToggleActive]}>
                <Text style={styles.preferenceToggleText}>{notificationsEnabled ? "Preference enabled" : "Preference disabled"}</Text>
                <Ionicons name={notificationsEnabled ? "toggle" : "toggle-outline"} size={27} color={colors.accent} />
              </Pressable>
            </> : null}

            {activeSetting === "Privacy" ? <Text style={styles.modalBody}>Liked songs, listening history, local playlists and your display name are stored on this device. Audius provides audio streams. MusicBrainz and Cover Art Archive are used for optional metadata and artwork matching. This build has no LumaMusic account or cloud profile sync.</Text> : null}

            {activeSetting === "About LumaMusic" ? <Text style={styles.modalBody}>LumaMusic 0.1.0{"\n"}Built by PauzeDevs. Streaming is provided by Audius. Recording metadata is enriched through MusicBrainz and Cover Art Archive when a reliable match is available.</Text> : null}

            <Pressable style={styles.closeAction} onPress={() => setActiveSetting(null)}><Text style={styles.closeActionText}>Done</Text></Pressable>
          </View>
        </View>
      </Modal>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
  topline: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 33, fontWeight: "800", letterSpacing: -1.2, marginTop: 9 },
  intro: { color: colors.muted, fontSize: 12, marginTop: 5, marginBottom: 22 },
  profileCard: { backgroundColor: "rgba(255,255,255,0.055)", borderRadius: 22, padding: 17, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", marginBottom: 27 },
  avatar: { width: 49, height: 49, borderRadius: 17, backgroundColor: "rgba(235,239,245,0.09)", borderWidth: 1, borderColor: "rgba(235,239,245,0.16)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontSize: 19, fontWeight: "800" },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  handle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  profileBadge: { width: 30, height: 30, borderRadius: 11, backgroundColor: "rgba(235,239,245,0.07)", alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  sectionMeta: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  nowCard: { backgroundColor: "rgba(235,239,245,0.035)", borderWidth: 1, borderColor: "rgba(235,239,245,0.12)", borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 27 },
  nowIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(235,239,245,0.07)", alignItems: "center", justifyContent: "center" },
  nowTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  nowSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.06)" },
  statusPillActive: { backgroundColor: "rgba(235,239,245,0.09)" },
  statusText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  settings: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 21, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, overflow: "hidden" },
  setting: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  last: { borderBottomWidth: 0 },
  settingIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "rgba(235,239,245,0.07)", borderWidth: 1, borderColor: "rgba(235,239,245,0.07)", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  settingSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  footerCard: { marginTop: 25, alignItems: "center", gap: 9, padding: 18, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.025)" },
  footer: { color: colors.subtle, fontSize: 10, textAlign: "center", lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: "#171A1F", borderRadius: 24, borderWidth: 1, borderColor: "rgba(235,239,245,0.16)", padding: 21, shadowColor: "#FFFFFF", shadowOpacity: 0.05, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalEyebrow: { color: colors.subtle, fontSize: 9, fontWeight: "800", letterSpacing: 1.7 },
  modalTitle: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 10, marginBottom: 10 },
  modalBody: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  modalInput: { color: colors.text, backgroundColor: "#0D0F12", borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, marginTop: 17, borderWidth: 1, borderColor: colors.border, fontSize: 14 },
  primaryAction: { backgroundColor: colors.accent, borderRadius: 13, padding: 13, alignItems: "center", marginTop: 12 },
  primaryActionText: { color: "#111317", fontSize: 13, fontWeight: "800" },
  speedOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 17 },
  speedOption: { minWidth: 70, paddingVertical: 11, borderRadius: 12, alignItems: "center", backgroundColor: "#0E1014", borderWidth: 1, borderColor: colors.border },
  speedOptionActive: { backgroundColor: "#D5DAE2", borderColor: "#D5DAE2" },
  speedText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  speedTextActive: { color: "#111317" },
  modalFootnote: { color: colors.subtle, fontSize: 11, marginTop: 13 },
  appearancePreview: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18, padding: 13, borderRadius: 14, backgroundColor: "#0D0F12", borderWidth: 1, borderColor: colors.border },
  previewSwatch: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#08090B", borderWidth: 1, borderColor: "#606873" },
  previewTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  previewSub: { color: colors.subtle, fontSize: 10, marginTop: 3 },
  preferenceToggle: { marginTop: 16, padding: 13, borderRadius: 13, backgroundColor: "#0D0F12", borderWidth: 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preferenceToggleActive: { borderColor: "rgba(235,239,245,0.25)" },
  preferenceToggleText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  closeAction: { alignSelf: "flex-end", paddingHorizontal: 17, paddingVertical: 11, marginTop: 17 },
  closeActionText: { color: colors.accent, fontSize: 13, fontWeight: "800" }
});
