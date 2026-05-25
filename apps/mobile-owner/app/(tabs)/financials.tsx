import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '../../lib/api';
import { useState } from 'react';

export default function FinancialsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['owner-soa'],
    queryFn: () => ownerApi.getStatements(),
  });

  const soa: any = (data as any)?.data ?? data;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Financials</Text>
        <Text style={styles.subtitle}>Statement of Account</Text>
      </View>

      {soa ? (
        <>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.income]}>
              <Text style={styles.summaryLabel}>Total Rent</Text>
              <Text style={styles.summaryValue}>AED {Number(soa.totalRent ?? 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryCard, styles.expenses]}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>AED {Number(soa.totalExpenses ?? 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryCard, styles.fee]}>
              <Text style={styles.summaryLabel}>Mgmt Fee</Text>
              <Text style={styles.summaryValue}>AED {Number(soa.mgmtFee ?? 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryCard, styles.net]}>
              <Text style={styles.summaryLabel}>Net Payout</Text>
              <Text style={[styles.summaryValue, styles.netValue]}>AED {Number(soa.netAmount ?? 0).toLocaleString()}</Text>
            </View>
          </View>

          {soa.collections?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rent Collections</Text>
              {soa.collections.map((c: any) => (
                <View key={c.id} style={styles.lineItem}>
                  <View>
                    <Text style={styles.lineTitle}>{c.tenant?.fullName}</Text>
                    <Text style={styles.lineDate}>{new Date(c.collectedAt).toLocaleDateString('en-AE')}</Text>
                  </View>
                  <Text style={styles.lineAmount}>AED {Number(c.amount).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          {soa.expenses?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              {soa.expenses.map((e: any) => (
                <View key={e.id} style={styles.lineItem}>
                  <View>
                    <Text style={styles.lineTitle}>{e.description}</Text>
                    <Text style={styles.lineDate}>{new Date(e.expenseDate).toLocaleDateString('en-AE')}</Text>
                  </View>
                  <Text style={[styles.lineAmount, styles.expenseAmt]}>-AED {Number(e.amount).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No financial data available</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  summaryCard: { width: '47%', borderRadius: 12, padding: 14 },
  income: { backgroundColor: '#d1fae5' },
  expenses: { backgroundColor: '#fee2e2' },
  fee: { backgroundColor: '#fef3c7' },
  net: { backgroundColor: '#10b981' },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  netValue: { color: '#ffffff' },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  lineTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  lineDate: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  lineAmount: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  expenseAmt: { color: '#ef4444' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
});
