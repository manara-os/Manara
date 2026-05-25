import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../lib/api';
import { useState } from 'react';

const DOC_ICONS: Record<string, string> = {
  LEASE_AGREEMENT: '📄',
  EJARI_CERTIFICATE: '🏛️',
  MOVE_IN_REPORT: '📋',
  MOVE_OUT_REPORT: '📋',
  PASSPORT_COPY: '🪪',
  EMIRATES_ID: '🪪',
  UTILITY_BILL: '⚡',
  NOC: '📝',
  OTHER: '📎',
};

export default function DocumentsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['tenant-documents'],
    queryFn: () => tenantApi.getDocuments(),
  });

  const docs = (data as any)?.data ?? data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={styles.container}
      data={docs}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>My Documents</Text>
          <Text style={styles.subtitle}>{docs.length} document{docs.length !== 1 ? 's' : ''}</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>No documents yet</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => {
        const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
        const expiringSoon = item.expiryDate && !isExpired &&
          new Date(item.expiryDate) < new Date(Date.now() + 30 * 86400000);
        return (
          <View style={[styles.card, isExpired && styles.cardExpired]}>
            <Text style={styles.docIcon}>{DOC_ICONS[item.documentType] ?? '📎'}</Text>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{item.name}</Text>
              <Text style={styles.docType}>{item.documentType?.replace(/_/g, ' ')}</Text>
              {item.expiryDate && (
                <Text style={[styles.expiry, isExpired && styles.expiryRed, expiringSoon && styles.expiryOrange]}>
                  {isExpired ? '⚠️ Expired' : expiringSoon ? '⚠️ Expiring soon' : '✓ Valid'} ·{' '}
                  {new Date(item.expiryDate).toLocaleDateString('en-AE')}
                </Text>
              )}
            </View>
            {item.fileUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(item.fileUrl)} style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            )}
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardExpired: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  docIcon: { fontSize: 28, marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  docType: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  expiry: { fontSize: 11, color: '#10b981' },
  expiryRed: { color: '#ef4444' },
  expiryOrange: { color: '#f97316' },
  viewBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnText: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
});
