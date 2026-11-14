import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { View } from "react-native";
import { DotPattern } from "../components/DotPattern";
import { StatusBar } from "expo-status-bar";
import { AudioPlayerProvider } from "../providers/AudioPlayerProvider";
import { useTheme } from "../theme/useTheme";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } } });
function ThemedNavigator() {
  const { colors, isDark } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <DotPattern />
    <StatusBar style={isDark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade_from_bottom", animationDuration: 320 }}>
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="account" options={{ presentation: "card", animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="appearance" options={{ presentation: "card", animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="modules" options={{ presentation: "card", animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="now-playing" options={{ presentation: "card", animation: "slide_from_bottom", animationDuration: 360 }} />
      <Stack.Screen name="lyrics" options={{ presentation: "card", animation: "fade_from_bottom", animationDuration: 320 }} />
      <Stack.Screen name="stats" options={{ presentation: "card", animation: "fade_from_bottom", animationDuration: 320 }} />
      <Stack.Screen name="queue" options={{ presentation: "card", animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="artist/[id]" options={{ animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="release/[id]" options={{ animation: "slide_from_right", animationDuration: 300 }} />
      <Stack.Screen name="playlist/[id]" options={{ animation: "slide_from_right", animationDuration: 300 }} />
    </Stack>
  </View>;
}
export default function RootLayout() { return <QueryClientProvider client={queryClient}><AudioPlayerProvider><ThemedNavigator /></AudioPlayerProvider></QueryClientProvider>; }
