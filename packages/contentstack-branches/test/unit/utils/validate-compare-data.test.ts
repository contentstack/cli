import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateCompareData } from '../../../src/utils';

describe('validateCompareData', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'branch-validate-'));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it('returns false for null/undefined', async () => {
    expect(await validateCompareData(null)).to.equal(false);
    expect(await validateCompareData(undefined)).to.equal(false);
  });

  it('returns false for cache ref with missing paths', async () => {
    expect(
      await validateCompareData({
        kind: 'cache',
        sessionId: 'x',
        paths: { content_types: '', global_fields: '/a' },
      }),
    ).to.equal(false);
  });

  it('returns false when cache JSONL files are empty', async () => {
    const ct = path.join(tmpDir, 'ct.jsonl');
    const gf = path.join(tmpDir, 'gf.jsonl');
    await fs.promises.writeFile(ct, '', 'utf8');
    await fs.promises.writeFile(gf, '', 'utf8');
    expect(
      await validateCompareData({
        kind: 'cache',
        sessionId: 'x',
        paths: { content_types: ct, global_fields: gf },
      }),
    ).to.equal(false);
  });

  it('returns true when cache has at least one JSONL line', async () => {
    const ct = path.join(tmpDir, 'ct.jsonl');
    const gf = path.join(tmpDir, 'gf.jsonl');
    await fs.promises.writeFile(ct, '{"uid":"a","status":"modified"}\n', 'utf8');
    await fs.promises.writeFile(gf, '', 'utf8');
    expect(
      await validateCompareData({
        kind: 'cache',
        sessionId: 'x',
        paths: { content_types: ct, global_fields: gf },
      }),
    ).to.equal(true);
  });

  it('returns true for inline compare data with non-empty module arrays', async () => {
    expect(
      await validateCompareData({
        content_types: { added: [{ uid: 'x' }], modified: [], deleted: [] },
        global_fields: { added: [], modified: [], deleted: [] },
      }),
    ).to.equal(true);
  });
});
