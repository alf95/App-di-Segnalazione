import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { registerBackgroundSyncTask } from '@/tasks/backgroundSync';

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);

  useEffect(() => {
    registerBackgroundSyncTask().catch((error) => {
      console.error('Failed to register background sync task', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </QueryClientProvider>
  );
}
