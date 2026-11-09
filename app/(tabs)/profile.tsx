import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { usePlayerStore } from "../../store/player";
import { useLibraryStore } from "../../store/library";
import { router } from "expo-router";

type DialogState = { title: string; message: string; confirm?: string; destructive?: boolean; onConfirm?: () => void } | null;

const settings = [
  { icon: "person-outline", title: "Account", subtitle: "Your LumaMusic profile" },
  { icon: "notifications-outline", title: "Notifications", subtitle: "New music and updates" },
  { icon: "color-palette-outline", title: "Appearance", subtitle: "Dark matte · Subtle glass" },
  { icon: "musical-notes-outline", title: "Playback", subtitle: "In-app playback controls" },
  { icon: "shield-checkmark-outline", title: "Privacy", subtitle: "Your data and listening activity" },
  { icon: "information-circle-outline", title: "About LumaMusic", subtitle: "Version 0.1.0 · PauzeDevs" }
] as const;

export default function ProfileScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const [dialog, setDialog] = useState<DialogState>(null);

  const openSetting = (title: string) => {
    if (title === "Playback") router.push("/audio-settings");
    else if (title === "Privacy") setDialog({
      title: "Clear your library?",
      message: "This removes liked songs, listening history and local playlists from this device. This cannot be undone.",
      confirm: "Clear library",
      destructive: true,
      onConfirm: () => useLibraryStore.getState().clearLibrary()
    });
    else if (title === "Account") setDialog({ title: "Your LumaMusic profile", message: "Cloud accounts and cross-device sync are not configured. Your collection currently stays on this device." });
    else if (title === "Notifications") setDialog({ title: "Notifications", message: "Push notifications are not enabled in this build. No notification permission has been requested." });
    else if (title === "Appearance") setDialog({ title: "Appearance", message: "LumaMusic uses a deep charcoal matte theme, quiet highlights and restrained translucent surfaces. The interface follows your system's dark appearance." });
    else void Linking.openURL("https://github.com/PauzeDevs/LumaMusic");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <View style={styles.topline}><View style={styles.liveDot} /><Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text></View>
        <Text style={styles.title}>Made for you.</Text>
        <Text style={styles.intro}>Your music world, tuned to your taste.</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Music listener</Text>
            <Text style={styles.handle}>Your LumaMusic profile</Text>
          </View>
          <Ionicons name="sparkles" size={18} color={colors.muted} />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your listening</Text><Text style={styles.sectionMeta}>NOW</Text></View>
        <View style={styles.nowCard}>
          <View style={styles.nowIcon}><Ionicons name="musical-notes" size={20} color={colors.mint} /></View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.nowTitle}>{currentTrack ? currentTrack.title : "Nothing playing right now"}</Text>
            <Text numberOfLines={1} style={styles.nowSub}>{currentTrack ? currentTrack.artist + " · LumaMusic" : "Pick a track and let the room fill up."}</Text>
          </View>
          <View style={[styles.statusPill, currentTrack && styles.statusPillActive]}><Text style={styles.statusText}>{currentTrack ? "READY" : "IDLE"}</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Preferences</Text><Text style={styles.sectionMeta}>PERSONALISE</Text></View>
        <View style={styles.settings}>
          {settings.map((item, index) => (
            <Pressable key={item.title} onPress={() => openSetting(item.title)} style={[styles.setting, index === settings.length - 1 && styles.last]} android_ripple={{ color: "rgba(255,255,255,0.06)" }}>
              <View style={styles.settingIcon}><Ionicons name={item.icon} size={20} color={colors.muted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
        <View style={styles.footerCard}>
          <Ionicons name="musical-notes" size={16} color={colors.accent} />
          <Text style={styles.footer}>Made for the love of listening.{"\n"}LumaMusic by PauzeDevs</Text>
        </View>
      </ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
      <Modal visible={!!dialog} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDialog(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{dialog?.title}</Text>
            <Text style={styles.dialogMessage}>{dialog?.message}</Text>
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setDialog(null)} style={styles.dialogButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              {dialog?.confirm ? <Pressable onPress={() => { const action = dialog.onConfirm; setDialog(null); action?.(); }} style={styles.dialogButton}><Text style={[styles.confirmText, dialog.destructive && styles.destructiveText]}>{dialog.confirm}</Text></Pressable> : <Pressable onPress={() => setDialog(null)} style={styles.dialogButton}><Text style={styles.confirmText}>Done</Text></Pressable>}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 22, paddingBottom: 38 },
  topline: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 16 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  title: { color: colors.text, fontSize: 36, fontWeight: "700", letterSpacing: -1.5, marginTop: 12 },
  intro: { color: colors.muted, fontSize: 14, marginTop: 7, marginBottom: 27 },
  profileCard: { minHeight: 105, flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 19, marginBottom: 34, borderRadius: 24, backgroundColor: "#151618", borderWidth: 1, borderColor: "rgba(255,255,255,0.065)" },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: "#242529", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.text, fontSize: 22, fontWeight: "700" },
  name: { color: colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  handle: { color: colors.muted, fontSize: 13, marginTop: 5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 13, marginTop: 5 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.55 },
  sectionMeta: { color: colors.subtle, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
  nowCard: { backgroundColor: "#141517", borderRadius: 20, padding: 15, flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 33 },
  nowIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#202225", alignItems: "center", justifyContent: "center" },
  nowTitle: { color: colors.text, fontSize: 14, fontWeight: "600" },
  nowSub: { color: colors.muted, fontSize: 12, marginTop: 5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#222427" },
  statusPillActive: { backgroundColor: "#29332F" },
  statusText: { color: colors.mint, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  settings: { paddingHorizontal: 2 },
  setting: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.065)", paddingHorizontal: 8 },
  last: { borderBottomWidth: 0 },
  settingIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: "#191A1D", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  settingSub: { color: colors.muted, fontSize: 12, marginTop: 5 },
  footerCard: { marginTop: 28, alignItems: "center", gap: 9, padding: 19 },
  footer: { color: colors.subtle, fontSize: 11, textAlign: "center", lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", alignItems: "center", padding: 26 },
  dialog: { width: "100%", maxWidth: 420, borderRadius: 26, padding: 24, backgroundColor: "#1B1C1F", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  dialogTitle: { color: colors.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  dialogMessage: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 12 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 25 },
  dialogButton: { minHeight: 42, justifyContent: "center", paddingHorizontal: 12 },
  cancelText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  confirmText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  destructiveText: { color: colors.danger }
});
