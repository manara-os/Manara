import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const tabIcon = (emoji: string) => ({ color, size }: { color: string; size: number }) => (
  <Text style={{ fontSize: size * 0.9, color }}>{emoji}</Text>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f0f0f0', elevation: 0, shadowOpacity: 0 },
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: tabIcon('📊') }} />
      <Tabs.Screen name="properties" options={{ title: 'Properties', tabBarIcon: tabIcon('🏢') }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets', tabBarIcon: tabIcon('🔧') }} />
      <Tabs.Screen name="leases" options={{ title: 'Leases', tabBarIcon: tabIcon('📄') }} />
      <Tabs.Screen name="alerts" options={{ tabBarIcon: tabIcon('🔔'), href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tabs>
  );
}
