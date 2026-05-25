import { FlatList, View, Text, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '../../lib/api';
import { useState } from 'react';

const DOC_ICONS: Record<string, string> = {
  LEASE_AGREEMENT: '📄',
  EJARI_CERTIFICATE: '🏛️',
  TITLE_DEED: '🏠',
  INSURANCE: '🛡️',
  NOC: '📝',
  OTHER: '📎',
};

export default function DocumentsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['owner-documents'],
    queryFn: () => ownerApi.getDocuments(),
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{docs.length} files</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>No documents</Text>
        </View>
      )}
      renderItem={({ item }: { item: any }) => {
        const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
        const expiringSoon = item.expiryDate && !isExpired &&
          new Date(item.expiryDate) < new Date(Date.now() + 60 * 86400000);

        return (
          <View style={[styles.card, isExpired && styles.cardExpired]}>
            <Text style={styles.docIcon}>{DOC_ICONS[item.documentType] ?? '📎'}</Text>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{item.name}</Text>
              <Text style={styles.docType}>{item.documentType?.replace(/_/g, ' ')}</Text>
              {item.expiryDate && (
                <Text style={[styles.expiry, isExpired && styles.red, expiringSoon && styles.orange]}>
                  {isExpired ? '⚠️ Expired' : expiringSoon ? '⚠️ Expiring soon' : 'Valid until'}{' '}
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
  docIcon: { fontSize: 26, marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  docType: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  expiry: { fontSize: 11, color: '#10b981' },
  red: { color: '#ef4444' },
  orange: { color: '#f97316' },
  viewBtn: { backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
});
