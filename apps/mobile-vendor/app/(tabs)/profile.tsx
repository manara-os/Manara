import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { vendorApi, authApi } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { data } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => vendorApi.getProfile(),
  });

  const profile: any = (data as any)?.data ?? data;

  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['manara_access_token', 'manara_refresh_token', 'manara_workspace_id']);
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'VN';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName ?? 'Vendor'}</Text>
        <Text style={styles.phone}>{profile?.phone ?? ''}</Text>
        {profile?.isApproved ? (
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedText}>✓ Approved Vendor</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending Approval</Text>
          </View>
        )}
      </View>

      {profile?.serviceCategories?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Categories</Text>
          <View style={styles.tags}>
            {profile.serviceCategories.map((cat: string) => (
              <View key={cat} style={styles.tag}>
                <Text style={styles.tagText}>{cat.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {profile?.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profile?.phone ?? '—'}</Text>
        </View>
        {profile?.companyName && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{profile.companyName}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E2B93B', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#1f2937' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  phone: { fontSize: 14, color: '#6b7280', marginBottom: 10 },
  approvedBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  approvedText: { fontSize: 12, fontWeight: '700', color: '#065f46' },
  pendingBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  pendingText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel: { fontSize: 13, color: '#9ca3af' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  logoutBtn: { margin: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#dc2626' },
});
