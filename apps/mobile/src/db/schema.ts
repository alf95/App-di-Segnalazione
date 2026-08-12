import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'reports',
      columns: [
        // WatermelonDB provides a built-in `id` field — do not redefine it
        { name: 'category_id', type: 'string' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'description', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'priority_score', type: 'number', isOptional: true },
        { name: 'media_ids', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        // WatermelonDB provides a built-in `id` field — do not redefine it
        { name: 'payload', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'entity', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'retry_count', type: 'number' },
      ],
    }),
  ],
});
