import 'dotenv/config';
import sharp from 'sharp';
import { kafkaService } from './services/kafka.service';
import { s3Service } from './services/s3.service';

interface MediaUploadedEvent {
  mediaId: string;
  key: string;
  confirmedAt: string;
}

interface MediaProcessedVariants {
  thumb: string;
  web: string;
  full: string;
}

const processMedia = async (payload: MediaUploadedEvent): Promise<void> => {
  const sourceBuffer = await s3Service.downloadBuffer(payload.key);
  const normalizedImage = sharp(sourceBuffer).rotate();

  const [thumbBuffer, webBuffer, fullBuffer] = await Promise.all([
    normalizedImage.clone().resize(200, 200, { fit: 'cover' }).webp({ quality: 80 }).toBuffer(),
    normalizedImage.clone().resize(800, null, { fit: 'inside' }).webp({ quality: 85 }).toBuffer(),
    normalizedImage
      .clone()
      .resize(1920, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer(),
  ]);

  const variants: MediaProcessedVariants = {
    thumb: `media/${payload.mediaId}/thumb.webp`,
    web: `media/${payload.mediaId}/web.webp`,
    full: `media/${payload.mediaId}/full.jpeg`,
  };

  await Promise.all([
    s3Service.uploadBuffer(variants.thumb, thumbBuffer, 'image/webp'),
    s3Service.uploadBuffer(variants.web, webBuffer, 'image/webp'),
    s3Service.uploadBuffer(variants.full, fullBuffer, 'image/jpeg'),
  ]);

  await kafkaService.emit('media.processed', {
    mediaId: payload.mediaId,
    variants,
    processedAt: new Date().toISOString(),
  });
};

const startWorker = async (): Promise<void> => {
  console.log('media worker starting');

  await kafkaService.consume(
    'media.uploaded',
    'media-service-consumer',
    async (rawPayload: unknown) => {
      const payload = rawPayload as Partial<MediaUploadedEvent>;

      if (!payload.mediaId || !payload.key || !payload.confirmedAt) {
        console.error('Received invalid media.uploaded payload', rawPayload);
        return;
      }

      try {
        await processMedia(payload as MediaUploadedEvent);
      } catch (error) {
        console.error('Failed to process media upload', error);
        await kafkaService.emit('media.uploaded.dlq', {
          payload,
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        });
      }
    },
  );
};

startWorker().catch((error) => {
  console.error('media worker failed to start', error);
  process.exitCode = 1;
});
