import { Ionicons } from "@react-native-vector-icons/ionicons/static";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../store/library";
import { useListeningStatsStore } from "../store/listeningStats";
import { useTheme } from "../theme/useTheme";

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const confirm = (title: string, message: string, action: () => void, button: string) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: button, style: "destructive", onPress: action }
    ]);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <View style={{ gap: 7, marginTop: 12 }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>Privacy & data</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>Manage information stored locally by LumaMusic. Opening this page never deletes data.</Text>
        </View>
        <View style={{ padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 9 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Your local library</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>Liked tracks, recently played tracks, imported-track references, and playlists.</Text>
          <Pressable onPress={() => confirm("Delete local library?", "This permanently removes liked tracks, recently played tracks, imported local-track references, and playlists from this device. It does not delete audio files outside LumaMusic or your Google Drive backup.", () => useLibraryStore.getState().clearLibrary(), "Delete local library")} style={{ marginTop: 5, padding: 13, borderRadius: 12, backgroundColor: colors.surfaceSoft }}>
            <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "700" }}>Delete local library…</Text>
          </Pressable>
        </View>
        <View style={{ padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 9 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Listening history</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>Listening time and play-count statistics saved on this device.</Text>
          <Pressable onPress={() => confirm("Delete listening history?", "This permanently removes your listening time and play-count statistics stored on this device.", () => useListeningStatsStore.getState().clearStats(), "Delete listening history")} style={{ marginTop: 5, padding: 13, borderRadius: 12, backgroundColor: colors.surfaceSoft }}>
            <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "700" }}>Delete listening history…</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
