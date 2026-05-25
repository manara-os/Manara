import {
  FlatList, View, Text, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '../../lib/api';
import { useState } from 'react';

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: '#eff6ff', text: '#1d4ed8' },
  ASSIGNED: { bg: '#fef3c7', text: '#92400e' },
  IN_PROGRESS: { bg: '#ecfdf5', text: '#065f46' },
  RESOLVED: { bg: '#d1fae5', text: '#065f46' },
  CLOSED: { bg: '#f3f4f6', text: '#374151' },
};

export default function MaintenanceScreen() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const { data, refetch } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: () => tenantApi.getMyTickets(),
  });

  const createMutation = useMutation({
    mutationFn: () => tenantApi.createTicket({ title, description, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-tickets'] });
      setShowNew(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      Alert.alert('Submitted', 'Your maintenance request has been submitted.');
    },
  });

  const tickets = (data as any)?.data ?? data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <>
      <FlatList
        style={styles.container}
        data={tickets}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Maintenance</Text>
              <Text style={styles.subtitle}>{tickets.length} requests</Text>
            </View>
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)}>
              <Text style={styles.newBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔨</Text>
            <Text style={styles.emptyText}>No maintenance requests</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowNew(true)}>
              <Text style={styles.emptyBtnText}>Submit a Request</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }: { item: any }) => {
          const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.OPEN;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
                <Text style={styles.ref}>{item.ticketRef}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
              <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString('en-AE')}</Text>
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <Modal visible={showNew} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Request</Text>
            <TouchableOpacity onPress={() => setShowNew(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Leaking tap in kitchen"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe the issue..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityBtnText, priority === p && styles.priorityBtnTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !title && styles.submitBtnDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!title || createMutation.isPending}
          >
            <Text style={styles.submitBtnText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  newBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  ref: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  cardDesc: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardDate: { fontSize: 11, color: '#9ca3af' },
  modal: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 15, color: '#4F46E5' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  textarea: { height: 100, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6' },
  priorityBtnActive: { backgroundColor: '#4F46E5' },
  priorityBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  priorityBtnTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
