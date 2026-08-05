import { useQuery } from '@tanstack/react-query';
import { FlatList, View, Text, TextInput, ActivityIndicator, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { pmApi } from '../lib/api';
import { formatNumber } from '../lib/format';

interface Tenant {
  id: string;
  fullName?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  kycVerified?: boolean;
  screeningStatus?: string;
  leases?: Array<{
    status?: string;
    annualRent?: string | number;
    unit?: { unitNumber?: string; property?: { name?: string } };
  }>;
}

const initials = (name?: string) =>
  (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function TenantCard({ t }: { t: Tenant }) {
  const active = (t.leases ?? []).find((l) => l.status === 'ACTIVE') ?? (t.leases ?? [])[0];
  const unit = active?.unit;

  return (
    <View
      style={{
        backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 10, padding: 15,
        borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 42, height: 42, borderRadius: 21, backgroundColor: '#0F766E',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>{initials(t.fullName)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{t.fullName ?? 'Unnamed'}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
            {unit ? `${unit.property?.name ?? '—'} · ${unit.unitNumber ?? ''}` : 'No active lease'}
          </Text>
        </View>

        {t.kycVerified ? (
          <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 10, color: '#065f46', fontWeight: '700' }}>KYC</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 10, color: '#92400e', fontWeight: '700' }}>PENDING</Text>
          </View>
        )}
      </View>

      {active?.annualRent ? (
        <Text style={{ fontSize: 12, color: '#374151', marginTop: 10 }}>
          Annual rent <Text style={{ fontWeight: '700' }}>AED {formatNumber(active.annualRent)}</Text>
          {t.nationality ? <Text style={{ color: '#9ca3af' }}>  ·  {t.nationality}</Text> : null}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        {t.phone ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${t.phone}`)}
            style={{ flex: 1, backgroundColor: '#0F766E', paddingVertical: 9, borderRadius: 8, alignItems: 'center', marginRight: 8 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }}>Call</Text>
          </TouchableOpacity>
        ) : null}
        {t.email ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(`mailto:${t.email}`)}
            style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 9, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#334155', fontSize: 12.5, fontWeight: '700' }}>Email</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function TenantsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  const { data, refetch, isLoading, isError } = useQuery<Tenant[]>({
    queryKey: ['pm-tenants'],
    queryFn: () => pmApi.getTenants(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = data ?? [];
    if (!term) return all;
    // Property managers look people up by name, by phone, or by the unit they
    // are standing outside of — so all three should match.
    return all.filter((t) => {
      const unit = (t.leases ?? []).map((l) => `${l.unit?.unitNumber ?? ''} ${l.unit?.property?.name ?? ''}`).join(' ');
      return `${t.fullName ?? ''} ${t.phone ?? ''} ${t.email ?? ''} ${unit}`.toLowerCase().includes(term);
    });
  }, [data, q]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Stack.Screen options={{ title: 'Tenants', headerShown: true }} />
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Stack.Screen options={{ title: 'Tenants', headerShown: true }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search name, phone or unit"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          style={{
            backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
            borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: '#111827',
          }}
        />
        <Text style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 7 }}>
          {rows.length} of {(data ?? []).length} tenants
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TenantCard t={item} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isError ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>📡</Text>
              <Text style={{ fontSize: 14, color: '#9f1239', marginTop: 8, fontWeight: '600' }}>Couldn&apos;t reach the server</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Pull down to try again.</Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>🔍</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
                {q ? 'No tenants match that search' : 'No tenants yet'}
              </Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
      />
    </View>
  );
}
