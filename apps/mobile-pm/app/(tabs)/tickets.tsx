import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { pmApi } from '../../lib/api';
import { formatDayMonth } from '../../lib/format';

interface Ticket {
  id: string;
  ticketNumber?: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  property?: { name: string };
  unit?: { unitNumber: string };
  vendor?: { name: string };
  createdAt: string;
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
];

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '#fef3c7', fg: '#92400e' },
  ASSIGNED: { bg: '#dbeafe', fg: '#1e40af' },
  IN_PROGRESS: { bg: '#e0e7ff', fg: '#4338ca' },
  RESOLVED: { bg: '#d1fae5', fg: '#065f46' },
  CLOSED: { bg: '#f3f4f6', fg: '#374151' },
};

function TicketCard({ t, onAdvance }: { t: Ticket; onAdvance: (id: string, next: string) => void }) {
  const statusStyle = STATUS_COLORS[t.status] ?? { bg: '#f3f4f6', fg: '#374151' };
  const priorityColor = PRIORITY_COLORS[t.priority] ?? '#6b7280';

  const nextStatus = t.status === 'OPEN' ? 'ASSIGNED' : t.status === 'ASSIGNED' ? 'IN_PROGRESS' : t.status === 'IN_PROGRESS' ? 'RESOLVED' : null;
  const nextLabel = t.status === 'OPEN' ? 'Assign' : t.status === 'ASSIGNED' ? 'Start work' : t.status === 'IN_PROGRESS' ? 'Mark resolved' : null;

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
        borderLeftWidth: 4,
        borderLeftColor: priorityColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{t.title}</Text>
          {t.ticketNumber && (
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.ticketNumber}</Text>
          )}
        </View>
        <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
          <Text style={{ fontSize: 10, color: statusStyle.fg, fontWeight: '700' }}>{t.status.replace('_', ' ')}</Text>
        </View>
      </View>

      {(t.property || t.unit) && (
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
          🏢 {t.property?.name ?? '—'}{t.unit?.unitNumber ? `  ·  ${t.unit.unitNumber}` : ''}
        </Text>
      )}

      {t.vendor && (
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          🔨 {t.vendor.name}
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: priorityColor + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ fontSize: 10, color: priorityColor, fontWeight: '700' }}>{t.priority}</Text>
          </View>
          <Text style={{ fontSize: 10, color: '#9ca3af', alignSelf: 'center' }}>
            {formatDayMonth(t.createdAt)}
          </Text>
        </View>
        {nextStatus && nextLabel && (
          <TouchableOpacity
            onPress={() => onAdvance(t.id, nextStatus)}
            style={{ backgroundColor: '#D97706', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>{nextLabel} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const qc = useQueryClient();

  const { data, refetch, isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ['pm-tickets'],
    queryFn: () => pmApi.getTickets(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      pmApi.updateTicketStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-tickets'] }),
    onError: () => Alert.alert('Update failed', 'Could not advance ticket. Try again.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAdvance = (id: string, next: string) => {
    Alert.alert('Advance ticket?', `Move ticket to ${next.replace('_', ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateStatus.mutate({ id, status: next }) },
    ]);
  };

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (filter === 'all') return list;
    return list.filter((t) => t.status === filter);
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
        {STATUS_FILTERS.map((f) => (
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
            <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.id ? '#ffffff' : '#6b7280' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TicketCard t={item} onAdvance={handleAdvance} />}
        ListEmptyComponent={
            isError ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 32 }}>📡</Text>
                <Text style={{ fontSize: 14, color: '#9f1239', marginTop: 8, fontWeight: '600' }}>Couldn&apos;t reach the server</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Pull down to try again.</Text>
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 32 }}>✨</Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>No tickets in this view</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      />
    </View>
  );
}
