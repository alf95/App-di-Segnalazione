import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { s3Service } from '../services/s3.service';

interface InitMediaRequestBody {
  contentType?: string;
  reportId?: string;
}

export const initHandler = async (
  req: Request<unknown, unknown, InitMediaRequestBody>,
  res: Response,
) => {
  try {
    const { contentType } = req.body;

    if (!contentType) {
      return res.status(400).json({
        type: 'https://urbanreport.dev/problems/invalid-request',
        title: 'Invalid request body',
        status: 400,
        detail: 'contentType is required',
        instance: req.originalUrl,
      });
    }

    const mediaId = uuidv4();
    const key = `uploads/pending/${mediaId}`;
    const ttlSeconds = Number(process.env.PRESIGNED_URL_TTL_SECONDS ?? 900);
    const uploadUrl = await s3Service.generatePresignedPutUrl(key, contentType, ttlSeconds);

    return res.status(200).json({ mediaId, uploadUrl, key });
  } catch (error) {
    console.error('Failed to initialize media upload', error);

    return res.status(500).json({
      type: 'https://urbanreport.dev/problems/internal-error',
      title: 'Unable to initialize media upload',
      status: 500,
      detail: 'The upload could not be initialized at this time.',
      instance: req.originalUrl,
    });
  }
};
