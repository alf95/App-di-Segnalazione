import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  // WatermelonDB provides a built-in `id` field accessible via `this.id`
  @field('payload') payload!: string;
  @field('operation') operation!: string;
  @field('entity') entity!: string;
  @field('created_at') createdAt!: number;
  @field('retry_count') retryCount!: number;
}
