import { useMemo, useRef } from 'react';
import { Dimensions, LayoutAnimation, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker } from 'react-native-maps';
import { ActivityIndicator, Text } from 'react-native-paper';
import { PriorityLevel, type Report } from '@urbanreport/types';
import { api } from '@/services/api';
import { useLocation } from '@/hooks/useLocation';

/**
 * `react-native-map-clustering@3.4.2` ships its defaults through
 * `ClusteredMapView.defaultProps`, but React 19 ignores `defaultProps` on
 * function components (it only applies to class components now).
 *
 * Without these props the library calls `restProps.mapRef(...)` from the
 * MapView ref callback and throws `TypeError: undefined is not a function`.
 * `clusteringEnabled` and `spiralEnabled` are also left undefined, and being
 * falsy they silently turn clustering off. These are the library's own
 * defaults, restated here rather than patching node_modules.
 */
const noop = (): void => undefined;

const CLUSTER_DEFAULTS = {
  clusteringEnabled: true,
  spiralEnabled: true,
  animationEnabled: true,
  preserveClusterPressBehavior: false,
  tracksViewChanges: false,
  layoutAnimationConf: LayoutAnimation.Presets.spring,
  // SuperCluster parameters
  radius: Dimensions.get('window').width * 0.06,
  maxZoom: 20,
  minZoom: 1,
  minPoints: 2,
  extent: 512,
  nodeSize: 64,
  // Map parameters
  edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
  // Cluster styles
  clusterColor: '#00B386',
  clusterTextColor: '#FFFFFF',
  spiderLineColor: '#FF0000',
  // Callbacks
  onRegionChangeComplete: noop,
  onClusterPress: noop,
  onMarkersChange: noop,
  mapRef: noop,
};

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
  const superClusterRef = useRef({});
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
    <ClusteredMapView
      {...CLUSTER_DEFAULTS}
      superClusterRef={superClusterRef}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation
    >
      {(reportsQuery.data?.items ?? []).map((report) => (
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
