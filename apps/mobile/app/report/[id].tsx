import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { ActivityIndicator, Button, Card, Divider, Text } from 'react-native-paper';
import { PriorityLevel } from '@urbanreport/types';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/services/api';

export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const reportQuery = useQuery({
    queryKey: ['report', params.id],
    queryFn: async () => await api.fetchReportById(params.id),
    enabled: Boolean(params.id),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => await api.confirmReport(params.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['report', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  if (reportQuery.isLoading || !reportQuery.data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const report = reportQuery.data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Card.Content style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text variant="headlineSmall">{report.category?.name ?? report.categoryId}</Text>
            <Text>{report.description}</Text>
          </View>
          <StatusBadge status={report.status} />
        </Card.Content>
      </Card>

      <Text variant="titleMedium">Priority</Text>
      <Text>
        {(report.priorityLevel ?? PriorityLevel.NORMAL).toLowerCase()} ({report.priorityScore})
      </Text>

      <Text variant="titleMedium">Location</Text>
      <MapView
        style={styles.map}
        pointerEvents="none"
        initialRegion={{
          latitude: report.location.latitude,
          longitude: report.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={report.location} />
      </MapView>

      <Text variant="titleMedium">Status timeline</Text>
      {report.statusHistory?.map((entry) => (
        <View key={entry.id} style={styles.timelineItem}>
          <Text variant="bodyLarge">{entry.toStatus}</Text>
          <Text>{new Date(entry.createdAt).toLocaleString()}</Text>
          {entry.comment ? <Text>{entry.comment}</Text> : null}
          <Divider />
        </View>
      ))}

      <Text variant="titleMedium">Photos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {(report.mediaItems ?? []).map((media) => {
          const imageUri = media.variants?.web ?? media.variants?.full ?? media.variants?.thumb;
          if (!imageUri) {
            return null;
          }

          return <Image key={media.id} source={{ uri: imageUri }} style={styles.photo} />;
        })}
      </ScrollView>

      <Button
        mode="contained"
        loading={confirmMutation.isPending}
        onPress={() => confirmMutation.mutate()}
      >
        Confirm Report
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    gap: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerContent: {
    flex: 1,
    gap: 6,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  timelineItem: {
    gap: 6,
  },
  photo: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
  },
});
