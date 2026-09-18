import type { Request, Response } from 'express';
import { kafkaService } from '../services/kafka.service';
import { s3Service } from '../services/s3.service';

interface ConfirmMediaRequestBody {
  mediaId?: string;
  key?: string;
}

export const confirmHandler = async (
  req: Request<unknown, unknown, ConfirmMediaRequestBody>,
  res: Response,
) => {
  try {
    const { mediaId, key } = req.body;

    if (!mediaId || !key) {
      return res.status(400).json({
        type: 'https://urbanreport.dev/problems/invalid-request',
        title: 'Invalid request body',
        status: 400,
        detail: 'mediaId and key are required',
        instance: req.originalUrl,
      });
    }

    const exists = await s3Service.objectExists(key);
    if (!exists) {
      return res.status(404).json({
        type: 'https://urbanreport.dev/problems/media-not-found',
        title: 'Media not found',
        status: 404,
        detail: 'The uploaded media object does not exist in storage.',
        instance: req.originalUrl,
      });
    }

    await kafkaService.emit('media.uploaded', {
      mediaId,
      key,
      confirmedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'processing',
      mediaId,
    });
  } catch (error) {
    console.error('Failed to confirm media upload', error);

    return res.status(500).json({
      type: 'https://urbanreport.dev/problems/internal-error',
      title: 'Unable to confirm media upload',
      status: 500,
      detail: 'The media upload could not be confirmed at this time.',
      instance: req.originalUrl,
    });
  }
};
