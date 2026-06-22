import { createReportSchema, updateStatusSchema, confirmReportSchema, paginationSchema } from './index';
import { ReportStatus } from '@urbanreport/types';

describe('createReportSchema', () => {
  const valid = {
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
    latitude: 45.46,
    longitude: 9.19,
    description: 'There is a large pothole on the main road causing danger',
  };

  it('accepts valid input', () => {
    expect(() => createReportSchema.parse(valid)).not.toThrow();
  });

  it('rejects non-UUID categoryId', () => {
    expect(() => createReportSchema.parse({ ...valid, categoryId: 'not-a-uuid' })).toThrow();
  });

  it('rejects latitude out of range', () => {
    expect(() => createReportSchema.parse({ ...valid, latitude: 91 })).toThrow();
    expect(() => createReportSchema.parse({ ...valid, latitude: -91 })).toThrow();
  });

  it('rejects longitude out of range', () => {
    expect(() => createReportSchema.parse({ ...valid, longitude: 181 })).toThrow();
    expect(() => createReportSchema.parse({ ...valid, longitude: -181 })).toThrow();
  });

  it('rejects description shorter than 10 chars', () => {
    expect(() => createReportSchema.parse({ ...valid, description: 'short' })).toThrow();
  });

  it('rejects description longer than 2000 chars', () => {
    expect(() => createReportSchema.parse({ ...valid, description: 'a'.repeat(2001) })).toThrow();
  });

  it('rejects more than 5 mediaIds', () => {
    const mediaIds = Array.from({ length: 6 }, () => '550e8400-e29b-41d4-a716-446655440000');
    expect(() => createReportSchema.parse({ ...valid, mediaIds })).toThrow();
  });

  it('rejects non-UUID mediaIds', () => {
    expect(() => createReportSchema.parse({ ...valid, mediaIds: ['not-a-uuid'] })).toThrow();
  });
});

describe('updateStatusSchema', () => {
  it('accepts valid status transition', () => {
    expect(() => updateStatusSchema.parse({ status: ReportStatus.SUBMITTED })).not.toThrow();
  });

  it('rejects invalid status value', () => {
    expect(() => updateStatusSchema.parse({ status: 'INVALID_STATUS' })).toThrow();
  });

  it('rejects comment longer than 1000 chars', () => {
    expect(() =>
      updateStatusSchema.parse({ status: ReportStatus.SUBMITTED, comment: 'a'.repeat(1001) }),
    ).toThrow();
  });
});

describe('confirmReportSchema', () => {
  it('accepts empty object', () => {
    expect(() => confirmReportSchema.parse({})).not.toThrow();
  });

  it('accepts optional comment', () => {
    expect(() => confirmReportSchema.parse({ comment: 'I confirm this report' })).not.toThrow();
  });

  it('rejects comment longer than 500 chars', () => {
    expect(() => confirmReportSchema.parse({ comment: 'a'.repeat(501) })).toThrow();
  });
});

describe('paginationSchema', () => {
  it('applies default limit of 20', () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
  });

  it('parses limit as number', () => {
    const result = paginationSchema.parse({ limit: '50' });
    expect(result.limit).toBe(50);
  });

  it('rejects limit > 100', () => {
    expect(() => paginationSchema.parse({ limit: '101' })).toThrow();
  });

  it('rejects non-numeric limit', () => {
    expect(() => paginationSchema.parse({ limit: 'abc' })).toThrow();
  });
});
