import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { pmApi } from '../../lib/api';

interface Lease {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED';
  moveInStatus?: 'PENDING' | 'ONGOING' | 'COMPLETE';
  startDate: string;
  endDate: string;
  annualRent: number;
  tenant?: { fullName: string };
  unit?: { unitNumber: string; property?: { name: string } };
  ejariStatus?: 'PENDING' | 'REGISTERED' | 'FAILED';
}

const MOVE_IN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'PENDING', label: '🔑 Pending', emoji: '🔑' },
  { id: 'ONGOING', label: '📦 Ongoing', emoji: '📦' },
  { id: 'expiring', label: '⏰ Expiring' },
];

function LeaseCard({ l, onAdvance }: { l: Lease; onAdvance: (id: string, next: 'ONGOING' | 'COMPLETE') => void }) {
  const daysToEnd = l.endDate ? Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86_400_000) : null;
  const expiringSoon = daysToEnd !== null && daysToEnd > 0 && daysToEnd <= 90;

  const moveInProgress = l.moveInStatus === 'PENDING' ? 33 : l.moveInStatus === 'ONGOING' ? 66 : l.moveInStatus === 'COMPLETE' ? 100 : 0;
  const moveInColor = l.moveInStatus === 'PENDING' ? '#f59e0b' : l.moveInStatus === 'ONGOING' ? '#3b82f6' : '#10b981';
  const showMoveIn = l.moveInStatus && l.moveInStatus !== 'COMPLETE';

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
            {l.tenant?.fullName ?? 'Unknown tenant'}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            🏢 {l.unit?.property?.name ?? '—'}  ·  {l.unit?.unitNumber ?? ''}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: l.status === 'ACTIVE' ? '#d1fae5' : '#f3f4f6',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: l.status === 'ACTIVE' ? '#065f46' : '#374151' }}>
            {l.status}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>Annual rent</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
            AED {(l.annualRent ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>End date</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: expiringSoon ? '#ef4444' : '#374151' }}>
            {l.endDate ? new Date(l.endDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          </Text>
          {expiringSoon && (
            <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '700' }}>{daysToEnd}d left</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>Ejari</Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: l.ejariStatus === 'REGISTERED' ? '#065f46' : l.ejariStatus === 'FAILED' ? '#991b1b' : '#92400e',
            }}
          >
            {l.ejariStatus ?? '—'}
          </Text>
        </View>
      </View>

      {showMoveIn && (
        <View style={{ marginTop: 12, padding: 10, backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '600' }}>Move-In Progress</Text>
            <Text style={{ fontSize: 11, color: moveInColor, fontWeight: '700' }}>{l.moveInStatus}</Text>
          </View>
          <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${moveInProgress}%`, height: '100%', backgroundColor: moveInColor }} />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
            {l.moveInStatus === 'PENDING' && (
              <TouchableOpacity
                onPress={() => onAdvance(l.id, 'ONGOING')}
                style={{ flex: 1, backgroundColor: '#3b82f6', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>📦 Start handover</Text>
              </TouchableOpacity>
            )}
            {l.moveInStatus === 'ONGOING' && (
              <TouchableOpacity
                onPress={() => onAdvance(l.id, 'COMPLETE')}
                style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>✅ Mark settled</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function LeasesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const qc = useQueryClient();

  const { data, refetch, isLoading } = useQuery<Lease[]>({
    queryKey: ['pm-leases'],
    queryFn: () => pmApi.getLeases(),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ONGOING' | 'COMPLETE' }) =>
      pmApi.advanceMoveIn(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-leases'] });
      Alert.alert('Updated', 'Move-in status advanced.');
    },
    onError: () => Alert.alert('Update failed', 'Could not advance move-in. Try again.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAdvance = (id: string, next: 'ONGOING' | 'COMPLETE') => {
    Alert.alert(
      next === 'ONGOING' ? 'Start handover?' : 'Mark settled?',
      next === 'ONGOING'
        ? 'Tenant will be notified handover is in progress.'
        : 'Tenant will be marked as settled, and renewal alerts (120/60/30/15d) will be scheduled.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => advance.mutate({ id, status: next }) },
      ],
    );
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === 'all') return list;
    if (filter === 'expiring')
      return list.filter((l) => {
        if (!l.endDate) return false;
        const d = (new Date(l.endDate).getTime() - Date.now()) / 86_400_000;
        return d > 0 && d <= 90;
      });
    return list.filter((l) => l.moveInStatus === filter);
  }, [data, filter]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        {MOVE_IN_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: filter === f.id ? '#D97706' : '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: filter === f.id ? '#ffffff' : '#6b7280' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LeaseCard l={item} onAdvance={handleAdvance} />}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 32 }}>📄</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>No leases in this view</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      />
    </View>
  );
}
