import { Tabs } from "expo-router";
import { LumaTabBar } from "../../components/LumaTabBar";
import { useTheme } from "../../theme/useTheme";
export default function TabLayout() {
  const { colors } = useTheme();
  return <Tabs tabBar={(props) => <LumaTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
    <Tabs.Screen name="index" /><Tabs.Screen name="search" /><Tabs.Screen name="library" /><Tabs.Screen name="profile" />
  </Tabs>;
}
