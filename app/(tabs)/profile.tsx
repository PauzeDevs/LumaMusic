import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { SiriRefreshOverlay, useSiriRefresh } from "../../components/SiriRefresh";

const settings = [
  { icon: "person-outline", title: "Account", subtitle: "Your LumaMusic profile" },
  { icon: "notifications-outline", title: "Notifications", subtitle: "New music and updates" },
  { icon: "color-palette-outline", title: "Appearance", subtitle: "Dark mode" },
  { icon: "musical-notes-outline", title: "Playback", subtitle: "Audio and player preferences" },
  { icon: "shield-checkmark-outline", title: "Privacy", subtitle: "Your data and listening activity" },
  { icon: "information-circle-outline", title: "About LumaMusic", subtitle: "Version 0.1.0 · PauzeDevs" }
] as const;

export default function ProfileScreen() {
  const { refreshing, onRefresh, assistantVisible } = useSiriRefresh();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent, colors.mint]} progressBackgroundColor={colors.surface} />}>
        <Text style={styles.eyebrow}>A LITTLE ABOUT YOU</Text>
        <Text style={styles.title}>Your space.</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Music listener</Text>
            <Text style={styles.handle}>Your LumaMusic profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settings}>
          {settings.map((item, index) => (
            <Pressable key={item.title} onPress={() => Alert.alert(item.title, "This setting will be connected in a later development phase.")} style={[styles.setting, index === settings.length - 1 && styles.last]}>
              <View style={styles.settingIcon}><Ionicons name={item.icon} size={19} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtle} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.footer}>Made for the love of listening.{ "\n" }LumaMusic by PauzeDevs</Text>
      </ScrollView>
      <SiriRefreshOverlay visible={assistantVisible} refreshing={refreshing} onPress={onRefresh} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.8, marginTop: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 6, marginBottom: 22 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: colors.border, marginBottom: 30 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#302742", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontSize: 18, fontWeight: "800" },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  handle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  settings: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  setting: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  settingIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#252033", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  settingSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  footer: { color: colors.subtle, fontSize: 11, textAlign: "center", lineHeight: 18, marginTop: 30 }
});