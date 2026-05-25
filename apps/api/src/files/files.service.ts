import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cloudfrontDomain: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'me-central-1'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET', 'manara-os-documents');
    this.cloudfrontDomain = config.get('AWS_CLOUDFRONT_DOMAIN', '');
  }

  async upload(
    file: Express.Multer.File,
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${workspaceId}/${entityType}/${entityId}/${uuidv4()}${ext}`;

    return this.uploadBuffer(file.buffer, key, file.mimetype);
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      // In development, just return a placeholder URL
      this.logger.debug(`[DEV] Would upload to S3: ${key}`);
      return `https://placeholder.manaraos.ae/${key}`;
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        Metadata: { uploadedAt: new Date().toISOString() },
      }),
    );

    return this.getPublicUrl(key);
  }

  async getPresignedUploadUrl(
    workspaceId: string,
    entityType: string,
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    this.validateMimeType(contentType);

    const ext = path.extname(fileName).toLowerCase();
    const key = `${workspaceId}/${entityType}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const fileUrl = this.getPublicUrl(key);

    return { uploadUrl, fileUrl, key };
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted S3 object: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
  }

  extractKeyFromUrl(url: string): string | null {
    if (url.includes(this.bucket)) {
      const parts = url.split('.amazonaws.com/');
      return parts[1] || null;
    }
    if (this.cloudfrontDomain && url.includes(this.cloudfrontDomain)) {
      return url.split(`${this.cloudfrontDomain}/`)[1] || null;
    }
    return null;
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) throw new BadRequestException('No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    this.validateMimeType(file.mimetype);
  }

  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} is not allowed`);
    }
  }
}
