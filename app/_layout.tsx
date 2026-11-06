import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AudioPlayerProvider } from "../providers/AudioPlayerProvider";
import { colors } from "../theme/colors";

export default function RootLayout() {
  return (
    <AudioPlayerProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="now-playing" options={{ presentation: "card", animation: "slide_from_bottom" }} />
      </Stack>
    </AudioPlayerProvider>
  );
}