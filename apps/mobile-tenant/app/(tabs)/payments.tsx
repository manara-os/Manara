import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../lib/api';
import { useState } from 'react';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  CLEARED: { bg: '#d1fae5', text: '#065f46' },
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  BOUNCED: { bg: '#fee2e2', text: '#991b1b' },
  CANCELLED: { bg: '#f3f4f6', text: '#374151' },
};

export default function PaymentsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['tenant-payments'],
    queryFn: () => tenantApi.getPayments(),
  });

  const payments = (data as any)?.data ?? data ?? [];
  const cleared = payments.filter((p: any) => p.status === 'CLEARED').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={styles.container}
      data={payments}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      ListHeaderComponent={() => (
        <View>
          <View style={styles.header}>
            <Text style={styles.title}>Payments</Text>
            <Text style={styles.subtitle}>{cleared}/{payments.length} cheques cleared</Text>
          </View>
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>Rent Collection Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${payments.length ? (cleared / payments.length) * 100 : 0}%` as any }]} />
            </View>
            <Text style={styles.progressPct}>{payments.length ? Math.round((cleared / payments.length) * 100) : 0}%</Text>
          </View>
        </View>
      )}
      renderItem={({ item }: { item: any }) => {
        const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING;
        const isOverdue = item.status === 'PENDING' && new Date(item.chequeDate) < new Date();
        return (
          <View style={[styles.card, isOverdue && styles.cardOverdue]}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardAmount}>AED {Number(item.amount).toLocaleString()}</Text>
              <Text style={styles.cardDate}>Cheque: {new Date(item.chequeDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              {item.chequeNumber && <Text style={styles.chequeNum}>#{item.chequeNumber}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>{item.status}</Text>
            </View>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  progressCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  progressLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 3 },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#4F46E5', textAlign: 'right' },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  cardOverdue: { borderLeftWidth: 3, borderLeftColor: '#f97316' },
  cardLeft: {},
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardDate: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  chequeNum: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
