import { createWriteStream } from 'node:fs';

export const BATCH_SIZE = 50;
export const CHUNK_FILE_SIZE_MB = 1;

export function getArrayFromResponse(data: unknown, arrayKey: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === 'object' && arrayKey in data) {
    const arr = (data as Record<string, unknown>)[arrayKey];
    return Array.isArray(arr) ? arr : [];
  }
  return [];
}

export function getAssetItems(
  assetsData: unknown,
): Array<{ uid?: string; _uid?: string; url?: string; filename?: string; file_name?: string }> {
  if (Array.isArray(assetsData)) return assetsData;
  const data = assetsData as Record<string, unknown>;
  const items = data?.items ?? data?.assets;
  return Array.isArray(items) ? items : [];
}

export function getReadableStreamFromDownloadResponse(
  response: { data?: NodeJS.ReadableStream } | NodeJS.ReadableStream | null,
): NodeJS.ReadableStream | null {
  if (!response) return null;
  const withData = response as { data?: NodeJS.ReadableStream };
  if (withData?.data != null) return withData.data;
  const stream = response as NodeJS.ReadableStream;
  return typeof stream?.pipe === 'function' ? stream : null;
}

export function writeStreamToFile(stream: NodeJS.ReadableStream, filePath: string): Promise<void> {
  const writer = createWriteStream(filePath);
  stream.pipe(writer);
  return new Promise<void>((resolve, reject) => {
    writer.on('finish', () => resolve());
    writer.on('error', reject);
  });
}
