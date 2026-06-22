import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface UseLocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export const useLocation = (): UseLocationState => {
  const [state, setState] = useState<UseLocationState>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const loadLocation = async (): Promise<void> => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setState({
            latitude: null,
            longitude: null,
            loading: false,
            error: 'Location permission denied',
          });
          return;
        }

        const currentPosition = await Location.getCurrentPositionAsync({});
        setState({
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          latitude: null,
          longitude: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to resolve location',
        });
      }
    };

    loadLocation().catch((error) => {
      setState({
        latitude: null,
        longitude: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to resolve location',
      });
    });
  }, []);

  return state;
};
