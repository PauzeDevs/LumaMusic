import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassSurface } from "../components/GlassSurface";
import { useLibraryStore } from "../store/library";
import { useListeningStatsStore } from "../store/listeningStats";
import { usePreferencesStore } from "../store/preferences";
import { useTheme } from "../theme/useTheme";
import {
  configureGoogleDriveSignIn,
  disconnectGoogleAccount,
  downloadLibraryBackup,
  isLibraryBackup,
  makeLibraryBackup,
  uploadLibraryBackup
} from "../services/googleDrive";

type AccountUser = { name: string; email: string; photo: string | null };

export default function AccountScreen() {
  const { colors } = useTheme();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const current = GoogleSignin.getCurrentUser();
    if (current) {
      setUser({
        name: current.user.name ?? "Music listener",
        email: current.user.email,
        photo: current.user.photo
      });
    }
  }, []);

  const connectGoogle = async () => {
    setBusy(true);
    try {
      configureGoogleDriveSignIn();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== "success") return;
      const current = GoogleSignin.getCurrentUser();
      if (!current) throw new Error("Google sign-in completed, but the account profile could not be read.");
      setUser({ name: current.user.name ?? "Music listener", email: current.user.email, photo: current.user.photo });
      const remote = await downloadLibraryBackup();
      if (remote && isLibraryBackup(remote)) {
        Alert.alert(
          "Cloud library found",
          "A LumaMusic backup already exists in this Google account. Restore it on this device?",
          [
            { text: "Keep this device", style: "cancel", onPress: () => {
              const local = useLibraryStore.getState();
              void uploadLibraryBackup(makeLibraryBackup(local, usePreferencesStore.getState(), useListeningStatsStore.getState().days)).then(() => setLastSync(new Date().toLocaleString())).catch((error) => Alert.alert("Backup failed", error instanceof Error ? error.message : "Please try again."));
            } },
            { text: "Restore cloud library", onPress: () => {
              useLibraryStore.setState({
                likedTracks: remote.likedTracks.filter((track) => track.source !== "local"),
                recentTracks: remote.recentTracks.filter((track) => track.source !== "local"),
                // Preserve files imported on this device. Private file paths cannot
                // be restored on a different device from cloud metadata.
                localTracks: useLibraryStore.getState().localTracks,
                playlists: remote.playlists.map((playlist) => ({
                  ...playlist,
                  tracks: playlist.tracks.filter((track) => track.source !== "local")
                }))
              });
              if (remote.preferences) usePreferencesStore.setState(remote.preferences);
              if (remote.listeningStats) useListeningStatsStore.setState({ days: remote.listeningStats });
              setLastSync(new Date().toLocaleString());
            } }
          ]
        );
      } else {
        await uploadLibraryBackup(makeLibraryBackup(useLibraryStore.getState(), usePreferencesStore.getState(), useListeningStatsStore.getState().days));
        setLastSync(new Date().toLocaleString());
      }
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert("Google connection failed", error instanceof Error ? error.message : "Please try again.");
      setUser(null);
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const backup = makeLibraryBackup(useLibraryStore.getState(), usePreferencesStore.getState(), useListeningStatsStore.getState().days);
      await uploadLibraryBackup(backup);
      setLastSync(new Date().toLocaleString());
      Alert.alert("Library backed up", "Your LumaMusic library is safely stored in your hidden Google Drive app data.");
    } catch (error) {
      Alert.alert("Sync failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => Alert.alert(
    "Disconnect Google?",
    "Your cloud backup will remain in Google Drive, but this device will stop syncing until you connect again.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: async () => {
        try { await disconnectGoogleAccount(); setUser(null); setLastSync(null); }
        catch (error) { Alert.alert("Could not disconnect", error instanceof Error ? error.message : "Please try again."); }
      } }
    ]
  );

  return (
    <SafeAreaView style={makeStyles(colors).safe} edges={["top", "bottom"]}>
      <View style={makeStyles(colors).header}>
        <Pressable onPress={() => router.back()} style={makeStyles(colors).back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View><Text style={makeStyles(colors).eyebrow}>YOUR LUMAMUSIC ID</Text><Text style={makeStyles(colors).title}>Account</Text></View>
      </View>
      <ScrollView contentContainerStyle={makeStyles(colors).content} showsVerticalScrollIndicator={false}>
        <View style={makeStyles(colors).heroIcon}><Ionicons name="cloud-done-outline" size={31} color={colors.accent} /></View>
        <Text style={makeStyles(colors).heroTitle}>{user ? "Your library travels with you." : "Your music. Your Google Drive."}</Text>
        <Text style={makeStyles(colors).heroCopy}>Connect Google to back up playlists, liked songs, listening history and preferences. Local audio files stay on this device and must be re-imported on another device. Backups live in Google's hidden appDataFolder.</Text>
        <GlassSurface style={makeStyles(colors).accountCard} contentStyle={makeStyles(colors).accountCardContent}>
          <View style={makeStyles(colors).googleIcon}><Ionicons name="logo-google" size={21} color={colors.text} /></View>
          <View style={{ flex: 1 }}>
            <Text style={makeStyles(colors).cardTitle}>{user?.name ?? "Google account"}</Text>
            <Text style={makeStyles(colors).cardSub}>{user?.email ?? "Not connected"}</Text>
          </View>
          <View style={[makeStyles(colors).status, user && makeStyles(colors).statusOn]}><Text style={makeStyles(colors).statusText}>{user ? "CONNECTED" : "OFFLINE"}</Text></View>
        </GlassSurface>
        {user ? (
          <>
            <Pressable disabled={busy} onPress={syncNow} style={makeStyles(colors).primaryButton}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />}
              <Text style={makeStyles(colors).primaryText}>{busy ? "Working..." : "Sync library now"}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={disconnect} style={makeStyles(colors).secondaryButton}><Text style={makeStyles(colors).secondaryText}>Disconnect Google</Text></Pressable>
            <Text style={makeStyles(colors).syncInfo}>{lastSync ? "Last synced: " + lastSync : "Connected. Your backup is ready."}</Text>
          </>
        ) : (
          <Pressable disabled={busy} onPress={connectGoogle} style={makeStyles(colors).primaryButton}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="logo-google" size={18} color="#FFFFFF" />}
            <Text style={makeStyles(colors).primaryText}>{busy ? "Connecting..." : "Continue with Google"}</Text>
          </Pressable>
        )}
        <GlassSurface style={makeStyles(colors).infoCard} contentStyle={makeStyles(colors).infoContent}>
          <View style={makeStyles(colors).infoRow}><Ionicons name="eye-off-outline" size={18} color={colors.accent} /><Text style={makeStyles(colors).infoTitle}>Invisible in Drive</Text></View>
          <Text style={makeStyles(colors).infoCopy}>The appDataFolder is private to LumaMusic and doesn't appear in the normal Google Drive interface.</Text>
          <View style={makeStyles(colors).infoRow}><Ionicons name="lock-closed-outline" size={18} color={colors.accent} /><Text style={makeStyles(colors).infoTitle}>Limited permission</Text></View>
          <Text style={makeStyles(colors).infoCopy}>LumaMusic requests only the drive.appdata scope. It cannot browse your documents, photos or other Drive files.</Text>
          <View style={makeStyles(colors).infoRow}><Ionicons name="phone-portrait-outline" size={18} color={colors.accent} /><Text style={makeStyles(colors).infoTitle}>Offline still works</Text></View>
          <Text style={makeStyles(colors).infoCopy}>Your existing on-device library stays available. Sync is currently started manually from this screen.</Text>
        </GlassSurface>
        <Text style={makeStyles(colors).footnote}>LumaMusic backs up streaming-library metadata, listening statistics and preferences. Local audio files are not uploaded; imported files remain on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 66, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  heroIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: "rgba(240,90,104,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  heroTitle: { color: colors.text, fontSize: 27, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8 },
  heroCopy: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 9, marginBottom: 23 },
  accountCard: { borderRadius: 19, marginBottom: 17 },
  accountCardContent: { padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  googleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  cardSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)" },
  statusOn: { backgroundColor: "rgba(90,190,140,0.14)" },
  statusText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: colors.accentStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 3 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  secondaryText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  syncInfo: { color: colors.subtle, fontSize: 10, textAlign: "center", marginTop: 3 },
  infoCard: { borderRadius: 19, marginTop: 22 },
  infoContent: { padding: 16, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 6 },
  infoTitle: { color: colors.text, fontSize: 12, fontWeight: "700" },
  infoCopy: { color: colors.muted, fontSize: 10, lineHeight: 16, marginLeft: 27, marginBottom: 3 },
  footnote: { color: colors.subtle, fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 17 }
});
