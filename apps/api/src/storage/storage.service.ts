import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET ?? 'kal-flow-contracts';
  private readonly internal: S3Client;
  private readonly publicClient: S3Client;
  private bucketReady?: Promise<void>;

  constructor() {
    const common = {
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'kal_flow',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'kal_flow_local_storage',
      },
    };
    this.internal = new S3Client({ ...common, endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000' });
    this.publicClient = new S3Client({ ...common, endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000' });
  }

  async put(objectKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.internal.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: body, ContentType: contentType }));
  }

  async createDownloadUrl(objectKey: string): Promise<{ url: string; expiresAt: string }> {
    const expiresIn = 5 * 60;
    const url = await getSignedUrl(this.publicClient, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), { expiresIn });
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async remove(objectKey: string): Promise<void> {
    await this.internal.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= this.prepareBucket();
    return this.bucketReady;
  }

  private async prepareBucket(): Promise<void> {
    try {
      await this.internal.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if ((process.env.S3_AUTO_CREATE_BUCKET ?? 'true') !== 'true') throw error;
      await this.internal.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
