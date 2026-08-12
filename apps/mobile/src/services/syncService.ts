import { Q } from '@nozbe/watermelondb';
import { ReportStatus, type CreateReportDto } from '@urbanreport/types';
import { api } from '@/services/api';
import { database } from '@/db/database';
import { ReportModel } from '@/db/models/Report';
import { SyncQueueModel } from '@/db/models/SyncQueue';
import { useSyncQueueStore } from '@/stores/syncQueueStore';

const generateUuid = (): string => {
  return (
    globalThis.crypto?.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    })
  );
};

const getPendingQueueCount = async (): Promise<number> => {
  const collection = database.get<SyncQueueModel>('sync_queue');
  const records = await collection.query().fetch();
  return records.length;
};

const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeHttpError = error as Error & { response?: unknown };
  return maybeHttpError.response == null;
};

export class SyncService {
  async queueReport(data: CreateReportDto): Promise<void> {
    const localId = generateUuid();
    const queueCollection = database.get<SyncQueueModel>('sync_queue');
    const reportsCollection = database.get<ReportModel>('reports');

    await database.write(async () => {
      await reportsCollection.create((record) => {
        record._raw.id = localId;
        record.reportId = localId;
        record.categoryId = data.categoryId;
        record.latitude = data.latitude;
        record.longitude = data.longitude;
        record.description = data.description;
        record.status = ReportStatus.DRAFT;
        record.priorityScore = undefined;
        record.mediaIds = data.mediaIds ? JSON.stringify(data.mediaIds) : undefined;
        record.synced = false;
        record.serverId = undefined;
        record.createdAt = Date.now();
      });

      await queueCollection.create((record) => {
        const queueId = generateUuid();
        record._raw.id = queueId;
        record.queueRecordId = queueId;
        record.payload = JSON.stringify({ id: localId, ...data });
        record.operation = 'create';
        record.entity = 'report';
        record.createdAt = Date.now();
        record.retryCount = 0;
      });
    });

    useSyncQueueStore.getState().setPendingCount(await getPendingQueueCount());
  }

  async syncPendingReports(): Promise<void> {
    const syncQueueStore = useSyncQueueStore.getState();
    syncQueueStore.setIsSyncing(true);

    try {
      const reportsCollection = database.get<ReportModel>('reports');
      const queueCollection = database.get<SyncQueueModel>('sync_queue');

      const [reports, queueItems] = await Promise.all([
        reportsCollection.query(Q.where('synced', false)).fetch(),
        queueCollection.query(Q.where('entity', 'report'), Q.where('operation', 'create')).fetch(),
      ]);

      const queueByReportId = new Map<string, SyncQueueModel>();
      for (const queueItem of queueItems) {
        const payload = JSON.parse(queueItem.payload) as { id?: string };
        if (payload.id) {
          queueByReportId.set(payload.id, queueItem);
        }
      }

      for (const report of reports) {
        const queueItem = queueByReportId.get(report.reportId);
        if (queueItem && queueItem.retryCount > 5) {
          continue;
        }

        const payload: CreateReportDto = {
          categoryId: report.categoryId,
          latitude: report.latitude,
          longitude: report.longitude,
          description: report.description,
          mediaIds: report.mediaIds ? (JSON.parse(report.mediaIds) as string[]) : [],
        };

        try {
          const createdReport = await api.createReport(payload);

          await database.write(async () => {
            await report.update((record) => {
              record.synced = true;
              record.status = createdReport.status;
              record.serverId = createdReport.id;
            });

            if (queueItem) {
              await queueItem.destroyPermanently();
            }
          });
        } catch (error) {
          if (!queueItem) {
            continue;
          }

          if (isNetworkError(error)) {
            await database.write(async () => {
              await queueItem.update((record) => {
                record.retryCount = record.retryCount + 1;
              });
            });
            continue;
          }

          throw error;
        }
      }
    } finally {
      syncQueueStore.setPendingCount(await getPendingQueueCount());
      syncQueueStore.setIsSyncing(false);
    }
  }
}

export const syncService = new SyncService();
