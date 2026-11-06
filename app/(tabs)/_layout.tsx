import { Tabs } from "expo-router";
import { LumaTabBar } from "../../components/LumaTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <LumaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#090A0F" } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}