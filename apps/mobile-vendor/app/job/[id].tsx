import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../lib/api';

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

const STATUS_FLOW: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  CLOSED: [],
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => vendorApi.getTicket(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => vendorApi.updateStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      qc.invalidateQueries({ queryKey: ['active-jobs'] });
    },
  });

  const job: any = (data as any)?.data ?? data;

  if (isLoading || !job) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  const nextStatuses = STATUS_FLOW[job.status] ?? [];

  const confirmStatus = (status: string) => {
    const label = status === 'IN_PROGRESS' ? 'Start Job' : 'Mark Complete';
    Alert.alert(label, `Set this job to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateMutation.mutate(status) },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerCard}>
        <View style={styles.refRow}>
          <Text style={styles.ref}>{job.ticketRef}</Text>
          <View style={[styles.priorityChip, { backgroundColor: PRIORITY_COLORS[job.priority] + '20' }]}>
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[job.priority] }]} />
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[job.priority] }]}>{job.priority}</Text>
          </View>
        </View>
        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{job.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.detail}>{job.unit?.unitNumber}</Text>
        <Text style={styles.detail}>{job.unit?.property?.name}</Text>
        {job.unit?.property?.address && (
          <Text style={styles.subDetail}>{job.unit.property.address}</Text>
        )}
      </View>

      {job.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Reported</Text>
          <Text style={styles.timeValue}>{new Date(job.createdAt).toLocaleDateString('en-AE')}</Text>
        </View>
        {job.assignedAt && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Assigned</Text>
            <Text style={styles.timeValue}>{new Date(job.assignedAt).toLocaleDateString('en-AE')}</Text>
          </View>
        )}
        {job.slaDueAt && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>SLA Due</Text>
            <Text style={[styles.timeValue, new Date(job.slaDueAt) < new Date() && styles.overdue]}>
              {new Date(job.slaDueAt).toLocaleDateString('en-AE')}
            </Text>
          </View>
        )}
        {job.resolvedAt && (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Resolved</Text>
            <Text style={styles.timeValue}>{new Date(job.resolvedAt).toLocaleDateString('en-AE')}</Text>
          </View>
        )}
      </View>

      {nextStatuses.length > 0 && (
        <View style={styles.actions}>
          {nextStatuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.actionBtn, status === 'RESOLVED' && styles.actionBtnGreen]}
              onPress={() => confirmStatus(status)}
              disabled={updateMutation.isPending}
            >
              <Text style={[styles.actionBtnText, status === 'RESOLVED' && styles.actionBtnTextWhite]}>
                {status === 'IN_PROGRESS' ? 'Start Job' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6b7280' },
  headerCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ref: { fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' },
  priorityChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  statusRow: { flexDirection: 'row' },
  status: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detail: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  subDetail: { fontSize: 13, color: '#6b7280' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  timeLabel: { fontSize: 13, color: '#9ca3af' },
  timeValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  overdue: { color: '#ef4444' },
  actions: { padding: 16, gap: 10 },
  actionBtn: { backgroundColor: '#E2B93B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionBtnGreen: { backgroundColor: '#10b981' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  actionBtnTextWhite: { color: '#ffffff' },
});
