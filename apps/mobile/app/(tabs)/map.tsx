import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { ActivityIndicator, Text } from 'react-native-paper';
import { PriorityLevel, type Report } from '@urbanreport/types';
import { api } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';

const getPriorityColor = (report: Report): string => {
  switch (report.priorityLevel) {
    case PriorityLevel.CRITICAL:
      return '#d32f2f';
    case PriorityLevel.HIGH:
      return '#f57c00';
    case PriorityLevel.NORMAL:
      return '#1976d2';
    default:
      return '#388e3c';
  }
};

export default function MapScreen() {
  const { latitude, longitude } = useLocation();
  const reportsQuery = useQuery({
    queryKey: ['reports', 'map'],
    queryFn: async () => await api.fetchReports(),
  });

  const initialRegion = useMemo(
    () => ({
      latitude: latitude ?? 45.4642,
      longitude: longitude ?? 9.19,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }),
    [latitude, longitude],
  );

  if (reportsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (reportsQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text>Unable to load nearby reports.</Text>
      </View>
    );
  }

  return (
    <ClusteredMapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
      {reportsQuery.data.data.map((report) => (
        <Marker
          key={report.id}
          coordinate={report.location}
          pinColor={getPriorityColor(report)}
          title={report.category?.name ?? report.categoryId}
          description={report.description}
          onPress={() =>
            router.push({
              pathname: '/report/[id]',
              params: { id: report.id },
            })
          }
        >
          <View style={[styles.marker, { backgroundColor: getPriorityColor(report) }]}>
            <Text style={styles.markerText}>{report.category?.iconName ?? '📍'}</Text>
          </View>
        </Marker>
      ))}
    </ClusteredMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
