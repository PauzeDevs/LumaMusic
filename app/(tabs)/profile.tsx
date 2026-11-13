import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { GlassSurface } from "../../components/GlassSurface";
import { usePlayerStore } from "../../store/player";
import { useLibraryStore } from "../../store/library";
import { router } from "expo-router";

const settings = [
  { icon: "person-outline", title: "Account", subtitle: "Your LumaMusic profile" },
  { icon: "notifications-outline", title: "Notifications", subtitle: "New music and updates" },
  { icon: "color-palette-outline", title: "Appearance", subtitle: "Colours, motion and listening layout" },
  { icon: "musical-notes-outline", title: "Playback", subtitle: "Playback, progress and sound controls" },
  { icon: "shield-checkmark-outline", title: "Privacy", subtitle: "Your data and listening activity" },
  { icon: "information-circle-outline", title: "About LumaMusic", subtitle: "Version 0.1.0 · PauzeDevs" }
] as const;

export default function ProfileScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <View style={styles.topline}><View style={styles.liveDot} /><Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text></View>
        <Text style={styles.title}>Made for you.</Text>
        <Text style={styles.intro}>Your music world, tuned to your taste.</Text>
        <GlassSurface style={styles.profileCard} contentStyle={styles.profileCardContent}>
          <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Music listener</Text>
            <Text style={styles.handle}>Your LumaMusic profile</Text>
          </View>
          <View style={styles.profileBadge}><Ionicons name="sparkles" size={13} color={colors.accent} /></View>
        </GlassSurface>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your listening</Text><Text style={styles.sectionMeta}>NOW</Text></View>
        <View style={styles.nowCard}>
          <View style={styles.nowIcon}><Ionicons name="musical-notes" size={20} color={colors.mint} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nowTitle}>{currentTrack ? currentTrack.title : "Nothing playing right now"}</Text>
            <Text style={styles.nowSub}>{currentTrack ? currentTrack.artist + " · Opened in external player" : "Pick a track and let the room fill up."}</Text>
          </View>
          <View style={[styles.statusPill, currentTrack && styles.statusPillActive]}><Text style={styles.statusText}>{currentTrack ? "OPEN" : "IDLE"}</Text></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Preferences</Text><Text style={styles.sectionMeta}>PERSONALISE</Text></View>
        <GlassSurface style={styles.settings} contentStyle={styles.settingsContent}>
          {settings.map((item, index) => (
            <Pressable key={item.title} onPress={() => {
              if (item.title === "Playback") {
                router.push("/audio-settings");
              } else if (item.title === "Privacy") {
                Alert.alert("Clear local library?", "This removes liked songs, listening history and local playlists from this device.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear library", style: "destructive", onPress: () => useLibraryStore.getState().clearLibrary() }
                ]);
              } else if (item.title === "Account") {
                Alert.alert("LumaMusic account", "Cloud accounts and cross-device sync are not configured. Your collection currently stays on this device.");
              } else if (item.title === "Notifications") {
                Alert.alert("Notifications", "Push notifications are not enabled in this build. No notification permission has been requested.");
              } else if (item.title === "Appearance") {
                Alert.alert("Appearance", "LumaMusic is using its dark matte theme with restrained glass-inspired surfaces.");
              } else {
                void Linking.openURL("https://github.com/PauzeDevs/LumaMusic");
              }
            }} style={[styles.setting, index === settings.length - 1 && styles.last]} android_ripple={{ color: "rgba(240,90,104,0.08)" }}>
              <View style={styles.settingIcon}><Ionicons name={item.icon} size={19} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
            </Pressable>
          ))}
        </GlassSurface>
        <View style={styles.footerCard}>
          <Ionicons name="musical-notes" size={16} color={colors.accent} />
          <Text style={styles.footer}>Made for the love of listening.{"\n"}LumaMusic by PauzeDevs</Text>
        </View>
      </ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
  topline: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 33, fontWeight: "800", letterSpacing: -1.2, marginTop: 9 },
  intro: { color: colors.muted, fontSize: 12, marginTop: 5, marginBottom: 22 },
  profileCard: { borderRadius: 22, marginBottom: 27 },
  profileCardContent: { padding: 17, flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: { width: 49, height: 49, borderRadius: 17, backgroundColor: "rgba(240,90,104,0.16)", borderWidth: 1, borderColor: "rgba(240,90,104,0.24)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontSize: 19, fontWeight: "800" },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  handle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  profileBadge: { width: 30, height: 30, borderRadius: 11, backgroundColor: "rgba(240,90,104,0.1)", alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  sectionMeta: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  nowCard: { backgroundColor: "rgba(255,255,255,0.055)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 27 },
  nowIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  nowTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  nowSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.06)" },
  statusPillActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  statusText: { color: colors.mint, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  settings: { borderRadius: 21 },
  settingsContent: { paddingHorizontal: 14 },
  setting: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  last: { borderBottomWidth: 0 },
  settingIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "rgba(198,167,255,0.09)", borderWidth: 1, borderColor: "rgba(198,167,255,0.1)", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  settingSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  footerCard: { marginTop: 25, alignItems: "center", gap: 9, padding: 18, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.025)" },
  footer: { color: colors.subtle, fontSize: 10, textAlign: "center", lineHeight: 17 }
});