import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../lib/api';
import { useState } from 'react';

export default function ActiveScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: () => vendorApi.getAssignedTickets(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => vendorApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-jobs'] }),
  });

  const allJobs = (data as any)?.data ?? data ?? [];
  const jobs = allJobs.filter((j: any) => j.status === 'IN_PROGRESS');

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
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>No active jobs</Text>
          <Text style={styles.emptySubtext}>Start a job from My Jobs tab to see it here</Text>
        </View>
      )}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Active Jobs</Text>
          <Text style={styles.subtitle}>{jobs.length} in progress</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => (
        <View style={styles.jobCard}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>● IN PROGRESS</Text>
          </View>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobRef}>{item.ticketRef}</Text>
          <Text style={styles.jobAddress}>
            {item.unit?.unitNumber} · {item.unit?.property?.name}
          </Text>
          <View style={styles.jobActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDone]}
              onPress={() => updateMutation.mutate({ id: item.id, status: 'RESOLVED' })}
            >
              <Text style={styles.btnTextDone}>Mark Complete</Text>
            </TouchableOpacity>
          </View>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 6 },
  jobCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#E2B93B',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statusBadge: { marginBottom: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#E2B93B', letterSpacing: 0.5 },
  jobTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  jobRef: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 4 },
  jobAddress: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  jobActions: { flexDirection: 'row' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnDone: { backgroundColor: '#10b981' },
  btnTextDone: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
