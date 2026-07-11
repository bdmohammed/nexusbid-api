/**
 * Mock S3 Service — LOCAL environment only.
 *
 * Executes the same code flow as the real S3 service but does NOT
 * call AWS APIs. Returns realistic dummy URLs and logs "[DUMMY TEST]".
 *
 * This file is conditionally re-exported by s3.service.ts when NODE_ENV=local.
 */
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../config/logger';
import { AppError } from '../../core/AppError';

function assertPdfExtension(fileName: string): void {
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    throw new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE');
  }
}

export async function generateUploadUrl(
  fileName: string,
): Promise<{ uploadUrl: string; documentKey: string; originalFileName: string }> {
  assertPdfExtension(fileName);

  const sanitized = fileName.replace(/\s+/g, '_').toLowerCase();
  const documentKey = `tenders/${uuidv4()}-${sanitized}`;
  const uploadUrl = `http://localhost:3000/dummy-s3-upload/${documentKey}`;

  logger.info(
    { mock: true, documentKey, fileName },
    '🗂️  [DUMMY TEST] S3 generateUploadUrl — no real AWS call (local env)',
  );

  return { uploadUrl, documentKey, originalFileName: fileName };
}

export async function generateDownloadUrl(
  documentKey: string,
  originalFileName: string,
): Promise<string> {
  const url = `http://localhost:3000/dummy-s3-download/${documentKey}?filename=${encodeURIComponent(originalFileName)}`;

  logger.info(
    { mock: true, documentKey, originalFileName },
    '🔗 [DUMMY TEST] S3 generateDownloadUrl — no real AWS call (local env)',
  );

  return url;
}

export async function deleteFile(documentKey: string): Promise<void> {
  logger.info(
    { mock: true, documentKey },
    '🗑️  [DUMMY TEST] S3 deleteFile — no real AWS call (local env)',
  );
}

export async function getFileSize(documentKey: string): Promise<number> {
  logger.info(
    { mock: true, documentKey },
    '🗂️  [DUMMY TEST] S3 getFileSize — no real AWS call (local env)',
  );
  return 1024 * 1024; // 1MB mock
}
