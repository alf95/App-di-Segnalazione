import { isRunningInExpoGo } from 'expo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncService } from '@/services/syncService';

export const BACKGROUND_SYNC = 'BACKGROUND_SYNC';

const taskScope = globalThis as typeof globalThis & {
  __urbanReportBackgroundSyncDefined?: boolean;
  __urbanReportBackgroundSyncRegistration?: Promise<void>;
};

if (!taskScope.__urbanReportBackgroundSyncDefined) {
  TaskManager.defineTask(BACKGROUND_SYNC, async () => {
    try {
      await syncService.syncPendingReports();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background sync failed', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  taskScope.__urbanReportBackgroundSyncDefined = true;
}

export const registerBackgroundSyncTask = async (): Promise<void> => {
  if (isRunningInExpoGo()) {
    return;
  }

  if (taskScope.__urbanReportBackgroundSyncRegistration) {
    return await taskScope.__urbanReportBackgroundSyncRegistration;
  }

  taskScope.__urbanReportBackgroundSyncRegistration = (async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  })();

  return await taskScope.__urbanReportBackgroundSyncRegistration;
};
