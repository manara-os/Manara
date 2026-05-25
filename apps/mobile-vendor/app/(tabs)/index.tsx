import { FlatList, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../lib/api';
import { useState } from 'react';

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

export default function JobsScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => vendorApi.getAssignedTickets(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => vendorApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  });

  const jobs = data?.data ?? data ?? [];

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
          <Text style={styles.title}>Assigned Jobs</Text>
          <Text style={styles.subtitle}>{jobs.length} open ticket{jobs.length !== 1 ? 's' : ''}</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => (
        <View style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] ?? '#6B7280' }]} />
            <Text style={styles.jobRef}>{item.ticketRef}</Text>
            <Text style={styles.jobStatus}>{item.status}</Text>
          </View>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobAddress}>
            {item.unit?.unitNumber} · {item.unit?.property?.name}
          </Text>
          <View style={styles.jobActions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => updateMutation.mutate({ id: item.id, status: 'IN_PROGRESS' })}
            >
              <Text style={styles.btnTextPrimary}>Start Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => updateMutation.mutate({ id: item.id, status: 'RESOLVED' })}
            >
              <Text style={styles.btnTextSecondary}>Mark Done</Text>
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
  jobCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  jobHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  jobRef: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  jobStatus: { marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  jobTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  jobAddress: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  jobActions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E2B93B' },
  btnSecondary: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  btnTextPrimary: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  btnTextSecondary: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
