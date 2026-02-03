import { expect } from 'chai';
import safePromise from '../../../src/utils/safe-promise';

describe('Safe Promise', () => {
  it('should return [null, result] when promise resolves', async () => {
    const promise = Promise.resolve('success');
    const [error, result] = await safePromise(promise);

    expect(error).to.be.null;
    expect(result).to.equal('success');
  });

  it('should return [error, null] when promise rejects', async () => {
    const testError = new Error('test error');
    const promise = Promise.reject(testError);
    const [error, result] = await safePromise(promise);

    expect(error).to.be.instanceOf(Error);
    expect(error?.message).to.equal('test error');
    expect(result).to.be.null;
  });

  it('should handle promise with object result', async () => {
    const data = { id: 1, name: 'test' };
    const promise = Promise.resolve(data);
    const [error, result] = await safePromise(promise);

    expect(error).to.be.null;
    expect(result).to.deep.equal(data);
  });

  it('should handle promise with array result', async () => {
    const data = [1, 2, 3];
    const promise = Promise.resolve(data);
    const [error, result] = await safePromise(promise);

    expect(error).to.be.null;
    expect(result).to.deep.equal(data);
  });

  it('should handle promise with null result', async () => {
    const promise = Promise.resolve(null);
    const [error, result] = await safePromise(promise);

    expect(error).to.be.null;
    expect(result).to.be.null;
  });
});
