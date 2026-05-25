import { useQuery } from '@tanstack/react-query';
import { FlatList, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { pmApi } from '../../lib/api';

interface Property {
  id: string;
  name: string;
  city?: string;
  emirate?: string;
  type?: string;
  status?: string;
  units?: any[];
  totalUnits?: number;
  occupiedUnits?: number;
}

function PropertyCard({ p }: { p: Property }) {
  const units = p.units ?? [];
  const total = p.totalUnits ?? units.length;
  const occupied = p.occupiedUnits ?? units.filter((u: any) => u.status === 'OCCUPIED').length;
  const vacant = total - occupied;
  const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const statusColor = p.status === 'ACTIVE' ? '#10b981' : '#9ca3af';

  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{p.name}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            📍 {[p.city, p.emirate].filter(Boolean).join(', ') || '—'}
            {p.type ? `  ·  ${p.type}` : ''}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: statusColor + '22',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
          }}
        >
          <Text style={{ fontSize: 10, color: statusColor, fontWeight: '700' }}>
            {p.status ?? 'ACTIVE'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Occupancy</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>{occupancy}%</Text>
        </View>
        <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
          <View
            style={{
              width: `${occupancy}%`,
              height: '100%',
              backgroundColor: occupancy >= 80 ? '#10b981' : occupancy >= 50 ? '#f59e0b' : '#ef4444',
            }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{total}</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>Units</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#10b981' }}>{occupied}</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>Occupied</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#f59e0b' }}>{vacant}</Text>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>Vacant</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, refetch, isLoading } = useQuery<Property[]>({
    queryKey: ['pm-properties'],
    queryFn: () => pmApi.getProperties(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  const properties = data ?? [];

  return (
    <FlatList
      style={{ backgroundColor: '#f9fafb' }}
      data={properties}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} in your portfolio
          </Text>
        </View>
      }
      renderItem={({ item }) => <PropertyCard p={item} />}
      ListEmptyComponent={
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 32 }}>🏢</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>No properties yet</Text>
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}
