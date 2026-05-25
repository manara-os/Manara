import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '../../lib/api';
import { useState } from 'react';

type PmaStatus = 'ACTIVE' | 'PENDING_RENEWAL' | 'EXPIRED';

function PmaStatusCard({ status, expiryDate }: { status: PmaStatus; expiryDate?: string }) {
  const config: Record<PmaStatus, { bg: string; border: string; accent: string; icon: string; title: string; message: string }> = {
    ACTIVE: {
      bg: '#ECFDF5', border: '#A7F3D0', accent: '#10B981',
      icon: '✅', title: 'PMA Active',
      message: 'Your Property Management Agreement is valid and in good standing.',
    },
    PENDING_RENEWAL: {
      bg: '#FFFBEB', border: '#FCD34D', accent: '#F59E0B',
      icon: '⚠️', title: 'PMA Renewal Due',
      message: expiryDate
        ? `Your agreement expires on ${expiryDate}. Please contact your property manager to renew.`
        : 'Your agreement is due for renewal. Contact your property manager.',
    },
    EXPIRED: {
      bg: '#FEF2F2', border: '#FECACA', accent: '#EF4444',
      icon: '🚨', title: 'PMA Expired',
      message: 'Your Property Management Agreement has expired. Please contact your PM immediately.',
    },
  };

  const c = config[status] ?? config.ACTIVE;

  return (
    <View style={[styles.pmaCard, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={styles.pmaHeader}>
        <Text style={styles.pmaIcon}>{c.icon}</Text>
        <View style={styles.pmaTitleBlock}>
          <Text style={styles.pmaTitle}>{c.title}</Text>
          <Text style={styles.pmaMessage}>{c.message}</Text>
        </View>
      </View>
      {(status === 'PENDING_RENEWAL' || status === 'EXPIRED') && (
        <TouchableOpacity
          style={[styles.pmaButton, { backgroundColor: c.accent }]}
          onPress={() => Alert.alert('Contact PM', 'Call or WhatsApp your property manager to renew the PMA.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'WhatsApp', onPress: () => Linking.openURL('whatsapp://send?text=Hi, I need to renew my PMA') },
          ])}
        >
          <Text style={styles.pmaButtonText}>Contact Property Manager</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function OverviewScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: portfolio, refetch: refetchPortfolio } = useQuery({
    queryKey: ['owner-portfolio'],
    queryFn: () => ownerApi.getPortfolio(),
  });

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['owner-profile'],
    queryFn: () => ownerApi.getMyProfile(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPortfolio(), refetchProfile()]);
    setRefreshing(false);
  };

  const pmaStatus: PmaStatus = (profile as any)?.pmaStatus ?? 'ACTIVE';
  const pmaExpiry: string | undefined = (profile as any)?.pmaRenewalAlertSentAt
    ? new Date((profile as any).pmaRenewalAlertSentAt).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
    : undefined;
  const showPmaBanner = pmaStatus === 'PENDING_RENEWAL' || pmaStatus === 'EXPIRED';

  const stats = [
    { label: 'Properties', value: (portfolio as any)?.summary?.totalProperties ?? '—', color: '#10B981' },
    { label: 'Occupied', value: (portfolio as any)?.summary?.occupiedUnits ?? '—', color: '#3B82F6' },
    { label: 'Vacant', value: (portfolio as any)?.summary?.vacantUnits ?? '—', color: '#F59E0B' },
    { label: 'Occupancy', value: `${(portfolio as any)?.summary?.occupancyRate ?? 0}%`, color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Good day!</Text>
        <Text style={styles.subtitle}>Here's your portfolio overview</Text>
      </View>

      {showPmaBanner && (
        <View style={styles.section}>
          <PmaStatusCard status={pmaStatus} expiryDate={pmaExpiry} />
        </View>
      )}

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{String(stat.value)}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Income</Text>
        <View style={styles.incomeCard}>
          <Text style={styles.incomeAmount}>
            AED {(((portfolio as any)?.summary?.totalAnnualRent ?? 0) / 12).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.incomeLabel}>Expected / month</Text>
        </View>
      </View>

      {/* PMA card (always visible, green when active) */}
      {!showPmaBanner && profile && (
        <View style={[styles.section, { paddingBottom: 20 }]}>
          <PmaStatusCard status={pmaStatus} expiryDate={pmaExpiry} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  section: { paddingHorizontal: 16, paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#ffffff', borderRadius: 12,
    padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  incomeCard: {
    backgroundColor: '#10B981', borderRadius: 16, padding: 20, alignItems: 'center',
  },
  incomeAmount: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  incomeLabel: { fontSize: 13, color: '#d1fae5', marginTop: 4 },
  // PMA card
  pmaCard: {
    borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 10,
  },
  pmaHeader: { flexDirection: 'row', gap: 10 },
  pmaIcon: { fontSize: 24, lineHeight: 28 },
  pmaTitleBlock: { flex: 1 },
  pmaTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  pmaMessage: { fontSize: 12, color: '#4B5563', lineHeight: 17 },
  pmaButton: {
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  pmaButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
});
