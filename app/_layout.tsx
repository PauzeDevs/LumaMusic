import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { colors } from "../theme/colors";

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="now-playing" options={{ presentation: "card", animation: "slide_from_bottom" }} />
      </Stack>
    </>
  );
}