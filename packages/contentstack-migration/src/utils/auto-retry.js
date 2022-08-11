'use strict';

const { MAX_RETRY } = require('./constants');

const __safePromise = (promise, data) => {
  return promise(data)
    .then((res) => [null, res])
    .catch((err) => [err]);
};

async function autoRetry(promise, retryCount = 0) {
  /**
   * Entries functions needs to pass params directly to http object,
   * whereas for content types it fetches request params from global map object,
   * thus the handling
   */
  let data;
  this && (data = this.data);

  const [error, result] = await __safePromise(promise, data);

  if (error) {
    retryCount++;
    if (retryCount === MAX_RETRY) {
      throw error;
    }
    return await autoRetry(promise, retryCount);
  }
  return result;
}

module.exports = autoRetry;
