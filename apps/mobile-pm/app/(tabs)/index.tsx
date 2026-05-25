import { useQuery } from '@tanstack/react-query';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { pmApi } from '../../lib/api';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  tone?: 'good' | 'bad' | 'warn' | 'neutral';
  icon: string;
}

function KpiCard({ label, value, delta, tone = 'neutral', icon }: KpiCardProps) {
  const toneColor =
    tone === 'good' ? '#10b981' : tone === 'bad' ? '#ef4444' : tone === 'warn' ? '#f59e0b' : '#6b7280';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 14,
        margin: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        minWidth: '45%',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 18, marginRight: 6 }}>{icon}</Text>
        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>{value}</Text>
      {delta && <Text style={{ fontSize: 11, color: toneColor, marginTop: 4 }}>{delta}</Text>}
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{subtitle}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: tickets, refetch: rt } = useQuery<any[]>({
    queryKey: ['pm-dashboard-tickets'],
    queryFn: () => pmApi.getTickets(),
  });
  const { data: leases, refetch: rl } = useQuery<any[]>({
    queryKey: ['pm-dashboard-leases'],
    queryFn: () => pmApi.getLeases(),
  });
  const { data: profile } = useQuery({
    queryKey: ['pm-profile'],
    queryFn: () => pmApi.getProfile().catch(() => null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([rt(), rl()]);
    setRefreshing(false);
  }, [rt, rl]);

  const openTickets = (tickets ?? []).filter((t: any) => t.status === 'OPEN' || t.status === 'ASSIGNED').length;
  const inProgress = (tickets ?? []).filter((t: any) => t.status === 'IN_PROGRESS').length;
  const expiring = (leases ?? []).filter((l: any) => {
    if (!l.endDate) return false;
    const days = (new Date(l.endDate).getTime() - Date.now()) / 86_400_000;
    return days > 0 && days <= 90;
  }).length;
  const pendingMoveIns = (leases ?? []).filter((l: any) => l.moveInStatus === 'PENDING' || l.moveInStatus === 'ONGOING').length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 13, color: '#6b7280' }}>Welcome back</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 2 }}>
          {profile?.fullName ?? 'Property Manager'}
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
          {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <SectionHeader title="Today's Pulse" subtitle="Operational snapshot" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}>
        <KpiCard label="Open tickets" value={openTickets} icon="🟠" tone={openTickets > 5 ? 'bad' : 'neutral'} />
        <KpiCard label="In progress" value={inProgress} icon="🔧" tone="neutral" />
        <KpiCard label="Pending move-ins" value={pendingMoveIns} icon="📦" tone={pendingMoveIns > 0 ? 'warn' : 'neutral'} />
        <KpiCard label="Leases expiring (90d)" value={expiring} icon="📅" tone={expiring > 0 ? 'warn' : 'good'} />
      </View>

      <SectionHeader title="Action Required" />

      {pendingMoveIns > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 4, padding: 14, backgroundColor: '#fef3c7', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>📦 Move-in handovers pending</Text>
          <Text style={{ fontSize: 12, color: '#78350f', marginTop: 4 }}>
            {pendingMoveIns} {pendingMoveIns === 1 ? 'tenant is' : 'tenants are'} mid-handover. Visit the Leases tab to advance status.
          </Text>
        </View>
      )}

      {expiring > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 14, backgroundColor: '#fee2e2', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#ef4444' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>⚠️ Leases expiring soon</Text>
          <Text style={{ fontSize: 12, color: '#7f1d1d', marginTop: 4 }}>
            {expiring} {expiring === 1 ? 'lease expires' : 'leases expire'} in the next 90 days. Trigger renewal or screening.
          </Text>
        </View>
      )}

      {openTickets > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 14, backgroundColor: '#dbeafe', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e40af' }}>🔧 Unassigned maintenance</Text>
          <Text style={{ fontSize: 12, color: '#1e3a8a', marginTop: 4 }}>
            {openTickets} ticket{openTickets === 1 ? '' : 's'} waiting for assignment. Open Tickets tab.
          </Text>
        </View>
      )}

      {pendingMoveIns === 0 && expiring === 0 && openTickets === 0 && tickets && leases && (
        <View style={{ marginHorizontal: 16, marginTop: 4, padding: 18, backgroundColor: '#ecfdf5', borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: 6 }}>✅</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#065f46' }}>All caught up!</Text>
          <Text style={{ fontSize: 12, color: '#047857', marginTop: 4, textAlign: 'center' }}>
            No urgent actions on your plate.
          </Text>
        </View>
      )}

      {!tickets && !leases && (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#D97706" />
          <Text style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Loading…</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
