import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { List, Text } from 'react-native-paper';
import type { Report } from '@urbanreport/types';
import { StatusBadge } from '@/components/StatusBadge';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

export default function MyReportsScreen() {
  const { user } = useAuth();
  const pendingCount = useSyncQueueStore((state) => state.pendingCount);
  const isSyncing = useSyncQueueStore((state) => state.isSyncing);

  const reportsQuery = useQuery({
    queryKey: ['reports', 'my-reports', user?.id],
    queryFn: async () => await api.fetchReports({ userId: user?.id }),
  });

  const reports = useMemo(() => {
    return (
      reportsQuery.data?.data.filter((report) => !user?.id || report.reporterId === user.id) ?? []
    );
  }, [reportsQuery.data?.data, user?.id]);

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={reports}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<SyncStatusBar pendingCount={pendingCount} isSyncing={isSyncing} />}
      refreshControl={
        <RefreshControl
          refreshing={reportsQuery.isRefetching}
          onRefresh={() => reportsQuery.refetch()}
        />
      }
      renderItem={({ item }: { item: Report }) => (
        <List.Item
          title={item.category?.name ?? item.categoryId}
          description={item.description}
          onPress={() =>
            router.push({
              pathname: '/report/[id]',
              params: { id: item.id },
            })
          }
          right={() => <StatusBadge status={item.status} />}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text>No reports found yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
