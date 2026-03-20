import { expect } from 'chai';
import path from 'path';
import fs from 'fs';
import {
  createSessionId,
  ensureSessionDir,
  appendJsonLine,
  readAllJsonLines,
  readJsonLinesChunked,
  cleanupSession,
  countJsonLines,
} from '../../../src/utils/cache-manager';

describe('cache-manager', () => {
  const root = path.join(process.cwd(), '.contentstack-branch-cache');

  afterEach(async () => {
    if (fs.existsSync(root)) {
      await fs.promises.rm(root, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  it('creates session, writes JSONL, reads chunks, counts lines, and cleans up', async () => {
    const sessionId = createSessionId();
    const dir = await ensureSessionDir(sessionId);
    const filePath = path.join(dir, 'test.jsonl');
    await appendJsonLine(filePath, { a: 1 });
    await appendJsonLine(filePath, { b: 2 });
    expect(await countJsonLines(filePath)).to.equal(2);

    const all = await readAllJsonLines<Record<string, number>>(filePath);
    expect(all).to.deep.equal([{ a: 1 }, { b: 2 }]);

    const chunks: Record<string, number>[][] = [];
    for await (const batch of readJsonLinesChunked<Record<string, number>>(filePath, 1)) {
      chunks.push(batch);
    }
    expect(chunks.length).to.equal(2);

    await cleanupSession(sessionId);
    expect(fs.existsSync(dir)).to.equal(false);
  });
});
