import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../theme/colors";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="now-playing" options={{ presentation: "card", animation: "slide_from_bottom" }} />
      </Stack>
    </>
  );
}