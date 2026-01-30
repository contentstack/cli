import { MAX_RETRY } from './constants';

const __safePromise = (promise: any, data: any): Promise<[Error | null, any]> => {
  return promise(data)
    .then((res: any) => [null, res])
    .catch((err: any) => [err]);
};

async function autoRetry(promise: any, retryCount: number = 0, data?: any): Promise<any> {
  /**
   * Entries functions needs to pass params directly to http object,
   * whereas for content types it fetches request params from global map object,
   * thus the handling
   */
  let requestData: any;
  if (data !== undefined) {
    requestData = data;
  }

  const [error, result] = await __safePromise(promise, requestData);

  if (error) {
    retryCount++;
    if (retryCount === MAX_RETRY) {
      throw error;
    }
    return await autoRetry(promise, retryCount, data);
  }
  return result;
}

export default autoRetry;
