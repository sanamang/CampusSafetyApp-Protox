import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#2d2d5e' },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarLabel: 'Map' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
