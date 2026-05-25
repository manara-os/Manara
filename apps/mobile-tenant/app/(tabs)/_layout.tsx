import { Tabs } from 'expo-router';
import { Home, CreditCard, Wrench, FileText, Bell } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#f0f0f0', elevation: 0, shadowOpacity: 0 },
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} /> }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Maintenance', tabBarIcon: ({ color, size }) => <Wrench size={size} color={color} /> }} />
      <Tabs.Screen name="documents" options={{ title: 'Documents', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Bell size={size} color={color} /> }} />
    </Tabs>
  );
}
