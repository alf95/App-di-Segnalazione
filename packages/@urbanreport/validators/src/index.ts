import { z } from 'zod';
import { ReportStatus } from '@urbanreport/types';

// ─── Create Report ────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  categoryId: z.string().uuid({ message: 'categoryId must be a valid UUID' }),
  latitude: z
    .number({ required_error: 'latitude is required' })
    .min(-90, 'latitude must be >= -90')
    .max(90, 'latitude must be <= 90'),
  longitude: z
    .number({ required_error: 'longitude is required' })
    .min(-180, 'longitude must be >= -180')
    .max(180, 'longitude must be <= 180'),
  description: z
    .string({ required_error: 'description is required' })
    .min(10, 'description must be at least 10 characters')
    .max(2000, 'description must not exceed 2000 characters'),
  mediaIds: z
    .array(z.string().uuid({ message: 'each mediaId must be a valid UUID' }))
    .max(5, 'a maximum of 5 media items are allowed per report')
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const CreateReportDtoSchema = createReportSchema;

// ─── Update Status ────────────────────────────────────────────────────────────

export const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus, {
    errorMap: () => ({ message: `status must be one of: ${Object.values(ReportStatus).join(', ')}` }),
  }),
  comment: z
    .string()
    .max(1000, 'comment must not exceed 1000 characters')
    .optional(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ─── Confirm Report ───────────────────────────────────────────────────────────

export const confirmReportSchema = z.object({
  comment: z
    .string()
    .max(500, 'comment must not exceed 500 characters')
    .optional(),
});

export type ConfirmReportInput = z.infer<typeof confirmReportSchema>;

// ─── Pagination query ─────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  after: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be a positive integer')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'limit must be between 1 and 100')
    .optional()
    .default('20'),
  municipalityId: z.string().uuid().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Re-export enums for convenience ─────────────────────────────────────────

export { ReportStatus } from '@urbanreport/types';
