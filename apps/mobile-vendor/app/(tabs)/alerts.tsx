import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../lib/api';
import { useState } from 'react';

export default function AlertsScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['vendor-notifications'],
    queryFn: () => vendorApi.getNotifications(),
    refetchInterval: 30_000,
  });

  const notifications = (data as any)?.data ?? data ?? [];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E2B93B" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread} new</Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No alerts</Text>
          <Text style={styles.emptySubtext}>You're all caught up!</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => (
        <View style={[styles.card, !item.isRead && styles.cardUnread]}>
          <View style={styles.dot}>
            {!item.isRead && <View style={styles.dotInner} />}
          </View>
          <View style={styles.content}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.notifTime}>
              {new Date(item.createdAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  unreadBadge: { backgroundColor: '#E2B93B', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2 },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardUnread: { backgroundColor: '#fffbeb' },
  dot: { width: 20, alignItems: 'center', paddingTop: 4 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2B93B' },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  notifBody: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: '#9ca3af' },
});
