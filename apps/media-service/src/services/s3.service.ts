import {
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.MEDIA_S3_BUCKET;
const region = process.env.MEDIA_S3_REGION ?? 'eu-west-1';

if (!bucket) {
  throw new Error('MEDIA_S3_BUCKET is required');
}

const streamToBuffer = async (stream: ReadableStream | NodeJS.ReadableStream): Promise<Buffer> => {
  if ('getReader' in stream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let completed = false;

    while (!completed) {
      const result = await reader.read();
      completed = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export class S3Service {
  private readonly client = new S3Client({ region });

  async generatePresignedPutUrl(
    key: string,
    contentType: string,
    ttlSeconds: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof NoSuchKey ||
        (error instanceof Error &&
          ['NoSuchKey', 'NotFound', 'NotFoundError'].includes(error.name)) ||
        (typeof error === 'object' &&
          error !== null &&
          '$metadata' in error &&
          typeof error.$metadata === 'object' &&
          error.$metadata !== null &&
          'httpStatusCode' in error.$metadata &&
          error.$metadata.httpStatusCode === 404)
      ) {
        return false;
      }

      throw error;
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`S3 object body missing for key ${key}`);
    }

    return await streamToBuffer(response.Body as ReadableStream | NodeJS.ReadableStream);
  }
}

export const s3Service = new S3Service();
