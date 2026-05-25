import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '../../lib/api';
import { useState } from 'react';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  RENT_DUE: { icon: '💳', color: '#f97316' },
  LEASE_RENEWAL: { icon: '📋', color: '#4F46E5' },
  MAINTENANCE_UPDATE: { icon: '🔧', color: '#10b981' },
  DOCUMENT_EXPIRY: { icon: '📄', color: '#ef4444' },
  GENERAL: { icon: '🔔', color: '#6b7280' },
};

export default function AlertsScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['tenant-notifications'],
    queryFn: () => tenantApi.getNotifications(),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => tenantApi.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => tenantApi.markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-notifications'] }),
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Alerts</Text>
            {unread > 0 && <Text style={styles.subtitle}>{unread} unread</Text>}
          </View>
          {unread > 0 && (
            <TouchableOpacity onPress={() => markAllMutation.mutate()} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>All caught up!</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => {
        const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.GENERAL;
        return (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.cardUnread]}
            onPress={() => !item.isRead && markReadMutation.mutate(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: config.color + '20' }]}>
              <Text style={styles.icon}>{config.icon}</Text>
            </View>
            <View style={styles.content}>
              <Text style={[styles.notifTitle, !item.isRead && styles.bold]}>{item.title}</Text>
              <Text style={styles.notifBody}>{item.body}</Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            {!item.isRead && <View style={[styles.dot, { backgroundColor: config.color }]} />}
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#4F46E5', marginTop: 2 },
  markAllBtn: {},
  markAllText: { fontSize: 13, color: '#4F46E5', fontWeight: '600', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardUnread: { backgroundColor: '#f5f3ff' },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 18 },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#111827', marginBottom: 3 },
  bold: { fontWeight: '700' },
  notifBody: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, color: '#9ca3af' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
