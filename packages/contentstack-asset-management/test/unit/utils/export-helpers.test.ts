import { expect } from 'chai';
import { PassThrough } from 'node:stream';

import {
  getArrayFromResponse,
  getAssetItems,
  getReadableStreamFromDownloadResponse,
  writeStreamToFile,
} from '../../../src/utils/export-helpers';

describe('export-helpers', () => {
  describe('getArrayFromResponse', () => {
    it('should return the input when it is already an array', () => {
      const arr = [1, 2, 3];
      expect(getArrayFromResponse(arr, 'items')).to.equal(arr);
    });

    it('should extract nested array by key', () => {
      const data = { fields: [{ uid: 'f1' }, { uid: 'f2' }] };
      const result = getArrayFromResponse(data, 'fields');
      expect(result).to.deep.equal([{ uid: 'f1' }, { uid: 'f2' }]);
    });

    it('should return [] when key exists but value is not an array', () => {
      const data = { fields: 'not-an-array' };
      expect(getArrayFromResponse(data, 'fields')).to.deep.equal([]);
    });

    it('should return [] when key is missing', () => {
      const data = { other: [1] };
      expect(getArrayFromResponse(data, 'fields')).to.deep.equal([]);
    });

    it('should return [] for null input', () => {
      expect(getArrayFromResponse(null, 'key')).to.deep.equal([]);
    });

    it('should return [] for undefined input', () => {
      expect(getArrayFromResponse(undefined, 'key')).to.deep.equal([]);
    });

    it('should return [] for non-object input (number)', () => {
      expect(getArrayFromResponse(42, 'key')).to.deep.equal([]);
    });
  });

  describe('getAssetItems', () => {
    it('should return the input when it is already an array', () => {
      const arr = [{ uid: 'a1' }];
      expect(getAssetItems(arr)).to.equal(arr);
    });

    it('should extract from data.items', () => {
      const data = { items: [{ uid: 'a1', url: 'http://example.com/a1' }] };
      expect(getAssetItems(data)).to.deep.equal(data.items);
    });

    it('should extract from data.assets', () => {
      const data = { assets: [{ uid: 'a2', filename: 'img.png' }] };
      expect(getAssetItems(data)).to.deep.equal(data.assets);
    });

    it('should prefer data.items over data.assets', () => {
      const data = { items: [{ uid: 'from-items' }], assets: [{ uid: 'from-assets' }] };
      expect(getAssetItems(data)).to.deep.equal([{ uid: 'from-items' }]);
    });

    it('should return [] when neither key exists', () => {
      expect(getAssetItems({ other: 'value' })).to.deep.equal([]);
    });

    it('should return [] for null input', () => {
      expect(getAssetItems(null)).to.deep.equal([]);
    });
  });

  describe('getReadableStreamFromDownloadResponse', () => {
    it('should return null for null input', () => {
      expect(getReadableStreamFromDownloadResponse(null)).to.be.null;
    });

    it('should extract response.data when present', () => {
      const inner = new PassThrough();
      const response = { data: inner };
      expect(getReadableStreamFromDownloadResponse(response)).to.equal(inner);
    });

    it('should return the stream itself if it has .pipe', () => {
      const stream = new PassThrough();
      expect(getReadableStreamFromDownloadResponse(stream as any)).to.equal(stream);
    });

    it('should return null for non-stream objects without data', () => {
      const obj = { something: 'else' } as any;
      expect(getReadableStreamFromDownloadResponse(obj)).to.be.null;
    });
  });

  describe('writeStreamToFile', () => {
    it('should resolve when stream finishes writing', async () => {
      const source = new PassThrough();
      const tmpPath = require('node:path').join(require('node:os').tmpdir(), `test-write-${Date.now()}.txt`);

      const promise = writeStreamToFile(source, tmpPath);
      source.end('hello world');
      await promise;

      const content = require('node:fs').readFileSync(tmpPath, 'utf-8');
      expect(content).to.equal('hello world');
      require('node:fs').unlinkSync(tmpPath);
    });

    it('should reject when the write stream errors', async () => {
      const source = new PassThrough();
      const badPath = '/nonexistent-dir-xyz/file.txt';

      try {
        await writeStreamToFile(source, badPath);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.code).to.equal('ENOENT');
      }
    });
  });
});
