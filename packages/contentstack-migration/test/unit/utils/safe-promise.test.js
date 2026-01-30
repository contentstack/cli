'use strict';

const { expect } = require('chai');
const safePromise = require('../../../src/utils/safe-promise');

describe('Safe Promise', () => {
  it('should return [null, result] for successful promise', async () => {
    const promise = Promise.resolve('success');
    const [err, result] = await safePromise(promise);
    expect(err).to.be.null;
    expect(result).to.equal('success');
  });

  it('should return [error, null] for failed promise', async () => {
    const error = new Error('Test error');
    const promise = Promise.reject(error);
    const [err, result] = await safePromise(promise);
    expect(err).to.equal(error);
    expect(result).to.be.undefined;
  });

  it('should handle promise with object result', async () => {
    const data = { id: 1, name: 'test' };
    const promise = Promise.resolve(data);
    const [err, result] = await safePromise(promise);
    expect(err).to.be.null;
    expect(result).to.deep.equal(data);
  });

  it('should handle promise with null result', async () => {
    const promise = Promise.resolve(null);
    const [err, result] = await safePromise(promise);
    expect(err).to.be.null;
    expect(result).to.be.null;
  });
});
