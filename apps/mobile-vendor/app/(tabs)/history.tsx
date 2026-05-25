import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '../../lib/api';
import { useState } from 'react';

export default function HistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['job-history'],
    queryFn: () => vendorApi.getHistory(),
  });

  const jobs = (data as any)?.data ?? data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={styles.container}
      data={jobs}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E2B93B" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Job History</Text>
          <Text style={styles.subtitle}>{jobs.length} completed</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No history yet</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.ref}>{item.ticketRef}</Text>
            <View style={[styles.badge, item.status === 'RESOLVED' ? styles.badgeGreen : styles.badgeGray]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.title2}>{item.title}</Text>
          <Text style={styles.address}>{item.unit?.unitNumber} · {item.unit?.property?.name}</Text>
          {item.resolvedAt && (
            <Text style={styles.date}>Resolved {new Date(item.resolvedAt).toLocaleDateString('en-AE')}</Text>
          )}
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ref: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#065f46' },
  title2: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  address: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  date: { fontSize: 11, color: '#9ca3af' },
});
