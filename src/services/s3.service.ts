import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

import { env } from '../config/env';
import { AppError } from '../core/AppError';
import { S3_URL_EXPIRY } from '../core/constants';

// ─── Local env: swap in dummy implementation (no real AWS calls) ─────────────
if (env.NODE_ENV === 'local') {
  module.exports = require('./mock/s3.mock');
}

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Validates that a filename ends with .pdf (case-insensitive).
 * Throws AppError if not — this is enforced BEFORE generating any pre-signed URL.
 */
function assertPdfExtension(fileName: string): void {
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE');
  }
}

/**
 * Sanitizes a filename for safe S3 key construction.
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

/**
 * Generates a pre-signed PUT URL for direct browser-to-S3 upload.
 *
 * The backend NEVER receives the file bytes — this is intentional.
 * It saves server RAM, CPU, and bandwidth.
 *
 * Flow:
 *   1. Frontend calls POST /api/v1/admin/tenders/upload-url with { fileName }
 *   2. Backend validates .pdf extension, returns { uploadUrl, documentKey }
 *   3. Frontend PUT-uploads directly to S3 using uploadUrl
 *   4. Frontend sends documentKey when creating/updating the tender
 */
export async function generateUploadUrl(
  fileName: string,
): Promise<{ uploadUrl: string; documentKey: string; originalFileName: string }> {
  assertPdfExtension(fileName);

  const sanitized = sanitizeFileName(fileName);
  const documentKey = `tenders/${uuidv4()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
    ContentType: 'application/pdf',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: S3_URL_EXPIRY.UPLOAD,
  });

  return { uploadUrl, documentKey, originalFileName: fileName };
}

/**
 * Generates a pre-signed GET URL for secure PDF download.
 * URL expires in 15 minutes — prevents link sharing.
 *
 * The Content-Disposition header triggers a browser download with the original filename.
 */
export async function generateDownloadUrl(
  documentKey: string,
  originalFileName: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
    ResponseContentDisposition: `attachment; filename="${originalFileName}"`,
    ResponseContentType: 'application/pdf',
  });

  return getSignedUrl(s3Client, command, { expiresIn: S3_URL_EXPIRY.DOWNLOAD });
}

/**
 * Deletes a file from S3.
 * Called when an admin soft-deletes a tender that has a document.
 */
export async function deleteFile(documentKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
  });
  await s3Client.send(command);
}

/**
 * Queries the S3 object metadata to verify and get the file size.
 */
export async function getFileSize(documentKey: string): Promise<number> {
  const command = new HeadObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
  });
  const response = await s3Client.send(command);
  return response.ContentLength ?? 0;
}
