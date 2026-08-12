import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class ReportModel extends Model {
  static table = 'reports';

  // WatermelonDB provides a built-in `id` field accessible via `this.id`
  @field('category_id') categoryId!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('description') description!: string;
  @field('status') status!: string;
  @field('priority_score') priorityScore?: number;
  @field('media_ids') mediaIds?: string;
  @field('synced') synced!: boolean;
  @field('server_id') serverId?: string;
  @field('created_at') createdAt!: number;
}
