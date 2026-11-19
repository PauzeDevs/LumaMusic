import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useEffect } from "react";
import { DotPattern } from "../components/DotPattern";
import { StatusBar } from "expo-status-bar";
import { AudioPlayerProvider } from "../providers/AudioPlayerProvider";
import PoTokenWebViewHost from "../components/PoTokenWebViewHost";
import { GlassBlurTarget } from "../modules/liquid-glass/src/GlassBlurTarget";
import { useTheme } from "../theme/useTheme";
import { registerIfAlreadyAllowed } from "../services/notifications";
import { useNotificationPreferences } from "../store/notificationPreferences";
import { usePreferencesStore } from "../store/preferences";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 2 * 60_000, retry: 1, refetchOnWindowFocus: false } } });
function ThemedNavigator() {
  const { colors, isDark } = useTheme();
  const motionStyle = usePreferencesStore((state) => state.motionStyle);
  const transitionDuration = motionStyle === "off" ? 0 : motionStyle === "subtle" ? 180 : 320;
  const screenAnimation = (animation: "fade" | "slide_from_right" | "slide_from_bottom" | "fade_from_bottom") => motionStyle === "off" ? "none" : animation;
  return <GlassBlurTarget><View style={{ flex: 1, backgroundColor: colors.background }}>
    <DotPattern />
    <StatusBar style={isDark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: screenAnimation("fade_from_bottom"), animationDuration: transitionDuration }}>
      <Stack.Screen name="(tabs)" options={{ animation: screenAnimation("fade"), animationDuration: transitionDuration }} />
      <Stack.Screen name="notifications" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="privacy" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="account" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="appearance" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="modules" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="now-playing" options={{ presentation: "card", animation: screenAnimation("slide_from_bottom"), animationDuration: transitionDuration }} />
      <Stack.Screen name="lyrics" options={{ presentation: "card", animation: screenAnimation("fade_from_bottom"), animationDuration: transitionDuration }} />
      <Stack.Screen name="stats" options={{ presentation: "card", animation: screenAnimation("fade_from_bottom"), animationDuration: transitionDuration }} />
      <Stack.Screen name="queue" options={{ presentation: "card", animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="artist/[id]" options={{ animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="release/[id]" options={{ animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
      <Stack.Screen name="playlist/[id]" options={{ animation: screenAnimation("slide_from_right"), animationDuration: transitionDuration }} />
    </Stack>
  </View></GlassBlurTarget>;
}
export default function RootLayout() {
  useEffect(() => {
    const preferences = useNotificationPreferences.getState();
    void registerIfAlreadyAllowed({ newMusic: preferences.newMusic, artistReleases: preferences.artistReleases, appAnnouncements: preferences.appAnnouncements }).catch(() => undefined);
  }, []);
  return <QueryClientProvider client={queryClient}><AudioPlayerProvider><><PoTokenWebViewHost /><ThemedNavigator /></></AudioPlayerProvider></QueryClientProvider>; }
