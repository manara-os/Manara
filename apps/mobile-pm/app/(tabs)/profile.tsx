import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { pmApi } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const ROLE_LABEL: Record<string, string> = {
  PM_ADMIN: 'PM Admin',
  PM_OPS: 'PM Operations',
  WORKSPACE_OWNER: 'PM Admin',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  PM_ADMIN: ['Full dashboard', 'All 6 workflows', 'Finance & reports', 'Owner & PMA management', 'Workspace settings'],
  PM_OPS: ['Leases & tenants', 'Maintenance tickets', 'Owner updates', 'Finance (read)'],
  WORKSPACE_OWNER: ['Full dashboard', 'All 6 workflows', 'Finance & reports', 'Owner & PMA management', 'Workspace settings'],
};

export default function ProfileScreen() {
  const { data: user } = useQuery({
    queryKey: ['pm-profile'],
    queryFn: () => pmApi.getProfile().catch(() => null),
  });

  const role = user?.workspaces?.[0]?.role ?? 'PM_OPS';
  const roleLabel = ROLE_LABEL[role] ?? role;
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  const initials = (user?.fullName ?? 'PM')
    .split(' ')
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will need your mobile + OTP to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['manara_access_token', 'manara_refresh_token', 'manara_workspace_id']);
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ alignItems: 'center', padding: 24, backgroundColor: '#ffffff' }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#D97706',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#ffffff' }}>{initials}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 }}>
          {user?.fullName ?? 'Property Manager'}
        </Text>
        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{user?.phone ?? '—'}</Text>
        <View
          style={{
            marginTop: 8,
            backgroundColor: '#fef3c7',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>{roleLabel}</Text>
        </View>
      </View>

      {/* Workspace */}
      {user?.workspaces?.[0]?.workspace && (
        <View style={{ marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>Workspace</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 4 }}>
            {user.workspaces[0].workspace.name}
          </Text>
          <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {user.workspaces[0].workspace.subscriptionPlan} plan  ·  {user.workspaces[0].workspace.countryCode}
          </Text>
        </View>
      )}

      {/* Permissions */}
      <View style={{ marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>
          Your access ({roleLabel})
        </Text>
        {permissions.map((p) => (
          <View key={p} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: '#10b981', marginRight: 6 }}>✓</Text>
            <Text style={{ fontSize: 13, color: '#374151' }}>{p}</Text>
          </View>
        ))}
      </View>

      {/* About */}
      <View style={{ marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>About</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: '#374151' }}>App</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>Manara PM</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 13, color: '#374151' }}>Version</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>1.0.0</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 13, color: '#374151' }}>Manara OS</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>v3.0</Text>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 24,
          padding: 14,
          backgroundColor: '#fee2e2',
          borderRadius: 12,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#991b1b' }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
