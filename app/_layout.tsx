import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AudioPlayerProvider } from "../providers/AudioPlayerProvider";
import { useTheme } from "../theme/useTheme";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } } });
function ThemedNavigator() {
  const { colors, isDark } = useTheme();
  return <>
    <StatusBar style={isDark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="account" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="appearance" options={{ presentation: "card", animation: "slide_from_right" }} /><Stack.Screen name="modules" options={{ presentation: "card", animation: "slide_from_right" }} /><Stack.Screen name="now-playing" options={{ presentation: "card", animation: "slide_from_bottom" }} />
      <Stack.Screen name="lyrics" options={{ presentation: "card", animation: "slide_from_bottom" }} /><Stack.Screen name="queue" options={{ presentation: "card", animation: "slide_from_right" }} />
      <Stack.Screen name="artist/[id]" options={{ animation: "slide_from_right" }} /><Stack.Screen name="release/[id]" options={{ animation: "slide_from_right" }} /><Stack.Screen name="playlist/[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  </>;
}
export default function RootLayout() { return <QueryClientProvider client={queryClient}><AudioPlayerProvider><ThemedNavigator /></AudioPlayerProvider></QueryClientProvider>; }
