import { useQuery } from '@tanstack/react-query';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { pmApi } from '../lib/api';
import { formatDate, formatNumber } from '../lib/format';

interface Cheque {
  id: string;
  chequeNumber?: string;
  bankName?: string;
  amount?: string | number;
  dueDate?: string;
  status?: string;
  bounceReason?: string | null;
  lease?: {
    tenant?: { fullName?: string; phone?: string };
    unit?: { unitNumber?: string; property?: { name?: string } };
  };
}

const daysLate = (due?: string) => {
  if (!due) return 0;
  const d = new Date(due).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 86_400_000));
};

function ChequeCard({ c }: { c: Cheque }) {
  const late = daysLate(c.dueDate);
  const tenant = c.lease?.tenant;
  const unit = c.lease?.unit;
  // Anything past a month is a different conversation from a few days late.
  const severe = late > 30;

  return (
    <View
      style={{
        backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 10, padding: 15,
        borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9',
        borderLeftWidth: 4, borderLeftColor: severe ? '#ef4444' : '#f59e0b',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
            {tenant?.fullName ?? 'Unknown tenant'}
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {unit?.property?.name ?? '—'}{unit?.unitNumber ? ` · ${unit.unitNumber}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
            AED {formatNumber(c.amount)}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: severe ? '#ef4444' : '#b45309', marginTop: 2 }}>
            {late} {late === 1 ? 'day' : 'days'} late
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>Cheque</Text>
          <Text style={{ fontSize: 12.5, color: '#374151', fontWeight: '600' }}>{c.chequeNumber ?? '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>Bank</Text>
          <Text style={{ fontSize: 12.5, color: '#374151', fontWeight: '600' }}>{c.bankName ?? '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>Due</Text>
          <Text style={{ fontSize: 12.5, color: '#374151', fontWeight: '600' }}>{formatDate(c.dueDate)}</Text>
        </View>
      </View>

      {c.bounceReason ? (
        <Text style={{ fontSize: 12, color: '#b91c1c', marginTop: 9 }}>Bounced — {c.bounceReason}</Text>
      ) : null}

      {tenant?.phone ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${tenant.phone}`)}
          style={{
            marginTop: 12, backgroundColor: '#0F766E', paddingVertical: 10,
            borderRadius: 9, alignItems: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>Call {tenant.phone}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function OverdueScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading, isError } = useQuery<Cheque[]>({
    queryKey: ['pm-overdue'],
    queryFn: () => pmApi.getOverdue(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rows = useMemo(
    () => [...(data ?? [])].sort((a, b) => daysLate(b.dueDate) - daysLate(a.dueDate)),
    [data],
  );
  const total = rows.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Stack.Screen options={{ title: 'Overdue rent', headerShown: true }} />
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen options={{ title: 'Overdue rent', headerShown: true }} />

      {rows.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>Outstanding across {rows.length} cheque{rows.length === 1 ? '' : 's'}</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#b91c1c', marginTop: 2 }}>
            AED {formatNumber(total)}
          </Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ChequeCard c={item} />}
        ListEmptyComponent={
          isError ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>📡</Text>
              <Text style={{ fontSize: 14, color: '#9f1239', marginTop: 8, fontWeight: '600' }}>Couldn&apos;t reach the server</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Pull down to try again.</Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>✅</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>Nothing overdue</Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      />
    </View>
  );
}
