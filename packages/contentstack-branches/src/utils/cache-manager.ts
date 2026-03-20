import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { sanitizePath } from '@contentstack/cli-utilities';
import config from '../config';

const mkdir = promisify(fs.mkdir);
const appendFile = promisify(fs.appendFile);
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);

export interface JsonLineWriter {
  readonly filePath: string;
  writeLine(obj: unknown): Promise<void>;
  close(): Promise<void>;
}

/**
 * Root directory for branch diff cache (under cwd).
 */
export function getCacheRootDir(): string {
  return path.resolve(process.cwd(), sanitizePath(config.cacheDir));
}

/**
 * Session directory for a single merge/diff operation.
 */
export function getSessionDir(sessionId: string): string {
  return path.join(getCacheRootDir(), sanitizePath(sessionId));
}

export function createSessionId(): string {
  return randomBytes(16).toString('hex');
}

export async function ensureSessionDir(sessionId: string): Promise<string> {
  const dir = getSessionDir(sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Create a JSON Lines writer (one JSON object per line).
 */
export function createJsonLineWriter(filePath: string): JsonLineWriter {
  const resolved = path.resolve(sanitizePath(filePath));
  let closed = false;
  return {
    filePath: resolved,
    async writeLine(obj: unknown): Promise<void> {
      if (closed) return;
      const line = `${JSON.stringify(obj)}\n`;
      await appendFile(resolved, line, 'utf8');
    },
    async close(): Promise<void> {
      closed = true;
    },
  };
}

/**
 * Append a single JSON line to a file (convenience for hot paths).
 */
export async function appendJsonLine(filePath: string, obj: unknown): Promise<void> {
  const resolved = path.resolve(sanitizePath(filePath));
  const line = `${JSON.stringify(obj)}\n`;
  await appendFile(resolved, line, 'utf8');
}

/**
 * Count non-empty lines in a JSONL file (streaming).
 */
export async function countJsonLines(filePath: string): Promise<number> {
  const resolved = path.resolve(sanitizePath(filePath));
  if (!fs.existsSync(resolved)) return 0;
  const stream = fs.createReadStream(resolved, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (line.trim()) count++;
  }
  return count;
}

/**
 * Read all lines as parsed JSON (use only when total size is bounded by maxMemoryItems).
 */
export async function readAllJsonLines<T = unknown>(filePath: string): Promise<T[]> {
  const resolved = path.resolve(sanitizePath(filePath));
  if (!fs.existsSync(resolved)) return [];
  const out: T[] = [];
  const stream = fs.createReadStream(resolved, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    out.push(JSON.parse(t) as T);
  }
  return out;
}

/**
 * Async generator: yield arrays of up to chunkSize parsed JSON objects.
 */
export async function* readJsonLinesChunked<T = unknown>(
  filePath: string,
  chunkSize: number,
): AsyncGenerator<T[], void, void> {
  const resolved = path.resolve(sanitizePath(filePath));
  if (!fs.existsSync(resolved)) return;
  const stream = fs.createReadStream(resolved, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let batch: T[] = [];
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    batch.push(JSON.parse(t) as T);
    if (batch.length >= chunkSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

/**
 * Split a combined diff JSONL file into content_types and global_fields JSONL files.
 * Returns paths to the two module files.
 */
export async function splitRawDiffToModules(
  rawDiffPath: string,
  sessionDir: string,
): Promise<{ contentTypesPath: string; globalFieldsPath: string }> {
  const contentTypesPath = path.join(sessionDir, 'content_types.jsonl');
  const globalFieldsPath = path.join(sessionDir, 'global_fields.jsonl');
  const ctWriter = createJsonLineWriter(contentTypesPath);
  const gfWriter = createJsonLineWriter(globalFieldsPath);
  try {
    for await (const batch of readJsonLinesChunked<Record<string, unknown>>(rawDiffPath, 500)) {
      for (const item of batch) {
        const t = item?.type as string | undefined;
        if (t === 'content_type' || t === 'content_types') {
          await ctWriter.writeLine(item);
        } else if (t === 'global_field' || t === 'global_fields') {
          await gfWriter.writeLine(item);
        }
      }
    }
  } finally {
    await ctWriter.close();
    await gfWriter.close();
  }
  return { contentTypesPath, globalFieldsPath };
}

/**
 * Remove session directory and all files.
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  const dir = getSessionDir(sessionId);
  if (fs.existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Remove a file if it exists (ignore errors).
 */
export async function safeUnlink(filePath: string): Promise<void> {
  try {
    const resolved = path.resolve(sanitizePath(filePath));
    if (fs.existsSync(resolved)) await unlink(resolved);
  } catch {
    /* ignore */
  }
}
