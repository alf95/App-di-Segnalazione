import type { Request, Response } from 'express';
import { confirmHandler } from './confirm.handler';
import { initHandler } from './init.handler';
import { kafkaService } from '../services/kafka.service';
import { s3Service } from '../services/s3.service';

// The real modules build an S3 client / Kafka client at import time, and the S3
// one throws when MEDIA_S3_BUCKET is absent, so both are replaced wholesale.
jest.mock('../services/s3.service', () => ({
  s3Service: {
    generatePresignedPutUrl: jest.fn(),
    objectExists: jest.fn(),
  },
}));

jest.mock('../services/kafka.service', () => ({
  kafkaService: { emit: jest.fn() },
}));

const generatePresignedPutUrl = jest.mocked(s3Service.generatePresignedPutUrl);
const objectExists = jest.mocked(s3Service.objectExists);
const emit = jest.mocked(kafkaService.emit);

const createResponse = () => {
  const status = jest.fn();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;

  status.mockReturnValue(res);
  json.mockReturnValue(res);

  return { status, json, res };
};

const createRequest = (body: unknown) =>
  ({ body, originalUrl: '/media/test' }) as unknown as Request;

beforeAll(() => {
  // The 500 paths log the underlying error; keep the test output readable.
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('initHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PRESIGNED_URL_TTL_SECONDS;
  });

  it('rejects a request without contentType', async () => {
    const { status, json, res } = createResponse();

    await initHandler(createRequest({}), res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Invalid request body',
        status: 400,
        detail: 'contentType is required',
      }),
    );
    expect(generatePresignedPutUrl).not.toHaveBeenCalled();
  });

  it('returns a presigned PUT url for a pending upload key', async () => {
    generatePresignedPutUrl.mockResolvedValue('https://s3.example/presigned');
    const { status, json, res } = createResponse();

    await initHandler(createRequest({ contentType: 'image/jpeg' }), res);

    const [key, contentType, ttlSeconds] = generatePresignedPutUrl.mock.calls[0];

    expect(status).toHaveBeenCalledWith(200);
    expect(key).toMatch(/^uploads\/pending\/[0-9a-f-]{36}$/);
    expect(contentType).toBe('image/jpeg');
    expect(ttlSeconds).toBe(900);
    expect(json).toHaveBeenCalledWith({
      mediaId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      uploadUrl: 'https://s3.example/presigned',
      key,
    });
  });

  it('honours PRESIGNED_URL_TTL_SECONDS when it is configured', async () => {
    process.env.PRESIGNED_URL_TTL_SECONDS = '60';
    generatePresignedPutUrl.mockResolvedValue('https://s3.example/presigned');
    const { res } = createResponse();

    await initHandler(createRequest({ contentType: 'image/png' }), res);

    const [, , ttlSeconds] = generatePresignedPutUrl.mock.calls[0];

    expect(ttlSeconds).toBe(60);
  });

  it('maps an unexpected storage failure to a 500 problem detail', async () => {
    generatePresignedPutUrl.mockRejectedValue(new Error('s3 unavailable'));
    const { status, json, res } = createResponse();

    await initHandler(createRequest({ contentType: 'image/jpeg' }), res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unable to initialize media upload',
        status: 500,
      }),
    );
  });
});

describe('confirmHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires both mediaId and key', async () => {
    const { status, json, res } = createResponse();

    await confirmHandler(createRequest({ mediaId: 'm-1' }), res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'mediaId and key are required' }),
    );
    expect(objectExists).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('returns 404 when the object was never uploaded', async () => {
    objectExists.mockResolvedValue(false);
    const { status, json, res } = createResponse();

    await confirmHandler(createRequest({ mediaId: 'm-2', key: 'uploads/pending/m-2' }), res);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Media not found' }));
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits media.uploaded once the object exists', async () => {
    objectExists.mockResolvedValue(true);
    const { status, json, res } = createResponse();

    await confirmHandler(createRequest({ mediaId: 'm-3', key: 'uploads/pending/m-3' }), res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ status: 'processing', mediaId: 'm-3' });
    expect(emit).toHaveBeenCalledWith(
      'media.uploaded',
      expect.objectContaining({ mediaId: 'm-3', key: 'uploads/pending/m-3' }),
    );
  });

  it('maps a storage failure to a 500 problem detail', async () => {
    objectExists.mockRejectedValue(new Error('s3 unavailable'));
    const { status, res } = createResponse();

    await confirmHandler(createRequest({ mediaId: 'm-4', key: 'uploads/pending/m-4' }), res);

    expect(status).toHaveBeenCalledWith(500);
  });
});
