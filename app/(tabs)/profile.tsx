import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";
import { usePlayerStore } from "../../store/player";

const settings = [
  { icon: "person-outline", title: "Account", subtitle: "Your LumaMusic profile" },
  { icon: "notifications-outline", title: "Notifications", subtitle: "New music and updates" },
  { icon: "color-palette-outline", title: "Appearance", subtitle: "Dark matte · Glass-inspired surfaces" },
  { icon: "musical-notes-outline", title: "Playback", subtitle: "Source-managed streaming quality" },
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
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Music listener</Text>
            <Text style={styles.handle}>Your LumaMusic profile</Text>
          </View>
          <View style={styles.profileBadge}><Ionicons name="sparkles" size={13} color={colors.accent} /></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your listening</Text><Text style={styles.sectionMeta}>NOW</Text></View>
        <View style={styles.nowCard}>
          <View style={styles.nowIcon}><Ionicons name="waveform" size={20} color={colors.mint} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nowTitle}>{currentTrack ? currentTrack.title : "Nothing playing right now"}</Text>
            <Text style={styles.nowSub}>{currentTrack ? currentTrack.artist + " · Audius stream" : "Pick a track and let the room fill up."}</Text>
          </View>
          <View style={[styles.statusPill, currentTrack && styles.statusPillActive]}><Text style={styles.statusText}>{currentTrack ? "READY" : "IDLE"}</Text></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Preferences</Text><Text style={styles.sectionMeta}>PERSONALISE</Text></View>
        <View style={styles.settings}>
          {settings.map((item, index) => (
            <Pressable key={item.title} onPress={() => {
              if (item.title === "Playback") {
                Alert.alert("Playback quality", "LumaMusic currently streams the format supplied by Audius. The source does not expose a dependable selectable bitrate ladder, so Auto / source-managed playback is used. A quality selector will appear when the streaming provider supports real quality variants.");
              } else if (item.title === "Appearance") {
                Alert.alert("Appearance", "LumaMusic uses a dark matte palette with translucent, glass-inspired surfaces. Full system blur and material effects are being refined.");
              } else {
                Alert.alert(item.title, "This setting will be connected in a later development phase.");
              }
            }} style={[styles.setting, index === settings.length - 1 && styles.last]} android_ripple={{ color: "rgba(198,167,255,0.08)" }}>
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
  profileCard: { backgroundColor: "rgba(255,255,255,0.055)", borderRadius: 22, padding: 17, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", marginBottom: 27 },
  avatar: { width: 49, height: 49, borderRadius: 17, backgroundColor: "rgba(198,167,255,0.16)", borderWidth: 1, borderColor: "rgba(198,167,255,0.24)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontSize: 19, fontWeight: "800" },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  handle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  profileBadge: { width: 30, height: 30, borderRadius: 11, backgroundColor: "rgba(198,167,255,0.1)", alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "750" },
  sectionMeta: { color: colors.subtle, fontSize: 8, fontWeight: "800", letterSpacing: 1.5 },
  nowCard: { backgroundColor: "rgba(166,232,212,0.055)", borderWidth: 1, borderColor: "rgba(166,232,212,0.14)", borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 27 },
  nowIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "rgba(166,232,212,0.1)", alignItems: "center", justifyContent: "center" },
  nowTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  nowSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.06)" },
  statusPillActive: { backgroundColor: "rgba(166,232,212,0.12)" },
  statusText: { color: colors.mint, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  settings: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 21, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, overflow: "hidden" },
  setting: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  last: { borderBottomWidth: 0 },
  settingIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "rgba(198,167,255,0.09)", borderWidth: 1, borderColor: "rgba(198,167,255,0.1)", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  settingSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  footerCard: { marginTop: 25, alignItems: "center", gap: 9, padding: 18, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.025)" },
  footer: { color: colors.subtle, fontSize: 10, textAlign: "center", lineHeight: 17 }
});