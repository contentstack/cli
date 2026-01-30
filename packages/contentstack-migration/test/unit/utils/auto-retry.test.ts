import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import autoRetry from '../../../src/utils/auto-retry';
import { MAX_RETRY } from '../../../src/utils/constants';

describe('Auto Retry', () => {
  let promiseStub: SinonStub;

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it('should return result on first success', async () => {
    const mockPromise = async () => Promise.resolve('success');
    const result = await autoRetry(mockPromise, 0);
    expect(result).to.equal('success');
  });

  it('should retry on error and succeed', async () => {
    let callCount = 0;
    const mockPromise = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('First attempt failed');
      }
      return 'success';
    };
    const result = await autoRetry(mockPromise, 0);
    expect(result).to.equal('success');
    expect(callCount).to.equal(2);
  });

  it('should throw error after max retries', async () => {
    const error = new Error('Persistent error');
    const mockPromise = async () => {
      throw error;
    };
    try {
      await autoRetry(mockPromise, 0);
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err).to.equal(error);
    }
  });

  it('should handle data parameter', async () => {
    const mockPromise = async (data: any) => Promise.resolve(data);
    const testData = { key: 'value' };
    const result = await autoRetry(mockPromise, 0, testData);
    expect(result).to.equal(testData);
  });

  it('should handle undefined data parameter', async () => {
    const mockPromise = async () => Promise.resolve('success');
    const result = await autoRetry(mockPromise, 0, undefined);
    expect(result).to.equal('success');
  });
});
