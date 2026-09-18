import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { ReportModel } from './models/Report';
import { SyncQueueModel } from './models/SyncQueue';
import { schema } from './schema';

const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: false,
});

export const database = new Database({
  adapter,
  modelClasses: [ReportModel, SyncQueueModel],
});
