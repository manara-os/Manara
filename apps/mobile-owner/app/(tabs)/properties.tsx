import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '../../lib/api';
import { useState } from 'react';

export default function PropertiesScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['owner-portfolio'],
    queryFn: () => ownerApi.getPortfolio(),
  });

  const portfolio: any = (data as any)?.data ?? data;
  const properties = portfolio?.properties ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={styles.container}
      data={properties}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Properties</Text>
          <Text style={styles.subtitle}>{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyText}>No properties in portfolio</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => {
        const units = item.units ?? [];
        const occupied = units.filter((u: any) => u.occupancyStatus === 'OCCUPIED').length;
        const total = item.totalUnits ?? units.length;
        const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.propertyName}>{item.name}</Text>
              <View style={[styles.occupancyBadge, occupancyRate === 100 && styles.fullBadge]}>
                <Text style={styles.occupancyText}>{occupancyRate}% Occupied</Text>
              </View>
            </View>
            <Text style={styles.address}>{item.address}</Text>
            <Text style={styles.city}>{item.city} · {item.propertyType?.replace(/_/g, ' ')}</Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, styles.green]}>{occupied}</Text>
                <Text style={styles.statLabel}>Occupied</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNum, styles.gray]}>{total - occupied}</Text>
                <Text style={styles.statLabel}>Vacant</Text>
              </View>
            </View>

            <View style={styles.occupancyBar}>
              <View style={[styles.occupancyFill, { width: `${occupancyRate}%` as any }]} />
            </View>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 80 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  propertyName: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  occupancyBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  fullBadge: { backgroundColor: '#10b981' },
  occupancyText: { fontSize: 11, fontWeight: '700', color: '#065f46' },
  address: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  city: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9ca3af', marginTop: 1 },
  green: { color: '#10b981' },
  gray: { color: '#9ca3af' },
  occupancyBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  occupancyFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
});
