import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../lib/api';
import { useState } from 'react';

type MoveInStatus = 'PENDING' | 'ONGOING' | 'COMPLETE';

const MOVE_IN_STEPS: { key: MoveInStatus; label: string; emoji: string }[] = [
  { key: 'PENDING', label: 'Keys Pending', emoji: '🔑' },
  { key: 'ONGOING', label: 'Moving In', emoji: '📦' },
  { key: 'COMPLETE', label: 'Settled In', emoji: '🏠' },
];

const STATUS_ORDER: Record<MoveInStatus, number> = { PENDING: 0, ONGOING: 1, COMPLETE: 2 };

function MoveInStatusBanner({ status }: { status: MoveInStatus }) {
  const currentIndex = STATUS_ORDER[status] ?? 0;
  const messages: Record<MoveInStatus, string> = {
    PENDING: 'Your move-in is being prepared. Your property manager will reach out soon.',
    ONGOING: 'Move-in in progress — complete your handover checklist with your PM.',
    COMPLETE: 'Welcome home! You\'re all settled in.',
  };
  const bannerColors: Record<MoveInStatus, string> = {
    PENDING: '#FFF7ED',
    ONGOING: '#EFF6FF',
    COMPLETE: '#ECFDF5',
  };
  const accentColors: Record<MoveInStatus, string> = {
    PENDING: '#F59E0B',
    ONGOING: '#3B82F6',
    COMPLETE: '#10B981',
  };

  return (
    <View style={[styles.moveInCard, { backgroundColor: bannerColors[status], borderColor: accentColors[status] }]}>
      <View style={styles.moveInHeader}>
        <Text style={styles.moveInTitle}>Move-In Status</Text>
        <View style={[styles.statusPill, { backgroundColor: accentColors[status] }]}>
          <Text style={styles.statusPillText}>{status}</Text>
        </View>
      </View>

      {/* Step progress */}
      <View style={styles.stepsRow}>
        {MOVE_IN_STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isActive = idx === currentIndex;
          return (
            <View key={step.key} style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                isDone && { backgroundColor: accentColors[status], borderColor: accentColors[status] },
                isActive && { borderColor: accentColors[status], borderWidth: 2 },
              ]}>
                <Text style={[styles.stepEmoji, { opacity: isDone || isActive ? 1 : 0.35 }]}>
                  {isDone ? '✓' : step.emoji}
                </Text>
              </View>
              <Text style={[styles.stepLabel, { color: isActive ? accentColors[status] : isDone ? '#374151' : '#9CA3AF' }]}>
                {step.label}
              </Text>
              {idx < MOVE_IN_STEPS.length - 1 && (
                <View style={[styles.stepConnector, { backgroundColor: idx < currentIndex ? accentColors[status] : '#E5E7EB' }]} />
              )}
            </View>
          );
        })}
      </View>

      <Text style={[styles.moveInMessage, { color: accentColors[status] }]}>{messages[status]}</Text>
    </View>
  );
}

export default function TenantHomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: lease, refetch } = useQuery({
    queryKey: ['my-lease'],
    queryFn: () => tenantApi.getMyLease(),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => tenantApi.getNotifications(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const moveInStatus: MoveInStatus = (lease as any)?.moveInStatus ?? 'PENDING';
  const showMoveInBanner = lease && moveInStatus !== 'COMPLETE';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Home</Text>
        {lease && (
          <View style={styles.leaseCard}>
            <Text style={styles.unitLabel}>{(lease as any).unit?.unitNumber}</Text>
            <Text style={styles.propertyName}>{(lease as any).unit?.property?.name}</Text>
            <Text style={styles.addressText}>{(lease as any).unit?.property?.address}</Text>
            <View style={styles.leaseRow}>
              <Text style={styles.leaseValue}>AED {((lease as any).annualRent / 12).toLocaleString('en-AE', { maximumFractionDigits: 0 })}</Text>
              <Text style={styles.leaseLabel}>/ month</Text>
            </View>
          </View>
        )}
      </View>

      {showMoveInBanner && (
        <View style={styles.section}>
          <MoveInStatusBanner status={moveInStatus} />
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { label: 'Raise Ticket', emoji: '🔧', color: '#EEF2FF' },
            { label: 'View Payments', emoji: '💳', color: '#ECFDF5' },
            { label: 'My Documents', emoji: '📄', color: '#FFF7ED' },
            { label: 'Contact PM', emoji: '📞', color: '#EFF6FF' },
          ].map((action) => (
            <TouchableOpacity key={action.label} style={[styles.actionCard, { backgroundColor: action.color }]}>
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  leaseCard: {
    backgroundColor: '#4F46E5', borderRadius: 16, padding: 20,
    shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  unitLabel: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  propertyName: { fontSize: 16, color: '#c7d2fe', marginTop: 2 },
  addressText: { fontSize: 12, color: '#a5b4fc', marginTop: 4 },
  leaseRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  leaseValue: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  leaseLabel: { fontSize: 13, color: '#c7d2fe', marginLeft: 4 },
  section: { paddingHorizontal: 16, paddingBottom: 4 },
  // Move-in banner
  moveInCard: {
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  moveInHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  moveInTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  stepsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, position: 'relative' },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  stepEmoji: { fontSize: 18 },
  stepLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
  stepConnector: {
    position: 'absolute', top: 19, right: '-45%', width: '90%', height: 2,
  },
  moveInMessage: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  // Quick actions
  quickActions: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
