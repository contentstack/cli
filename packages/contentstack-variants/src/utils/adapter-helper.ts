import pick from 'lodash/pick';
import { HttpClient, HttpClientOptions, HttpRequestConfig } from '@contentstack/cli-utilities';

import { APIConfig, AdapterHelperInterface, ExportConfig } from '../types';

export class AdapterHelper implements AdapterHelperInterface {
  public httpClient: HttpClient;
  public sharedConfig!: ExportConfig | Record<string, any>;

  constructor(public readonly config: APIConfig, options?: HttpClientOptions) {
    this.sharedConfig = config.sharedConfig || {};
    delete this.config.sharedConfig;
    const pickConfig: (keyof HttpRequestConfig)[] = [
      'url',
      'auth',
      'method',
      'baseURL',
      'headers',
      'adapter',
      'httpAgent',
      'httpsAgent',
      'responseType',
    ];
    this.httpClient = new HttpClient(pick(config, pickConfig), options);
  }

  /**
   * The function constructs a query string from a given object by encoding its key-value pairs.
   * @param query - It looks like you have a function `constructQuery` that takes a query object as a
   * parameter. The function loops through the keys in the query object and constructs a query string
   * based on the key-value pairs.
   * @returns The `constructQuery` function returns a string that represents the query parameters
   * constructed from the input `query` object. If the `query` object is empty (has no keys), the
   * function does not return anything (void).
   */
  constructQuery(query: Record<string, any>): string | void {
    if (Object.keys(query).length) {
      let queryParam = '';

      for (const key in query) {
        if (Object.prototype.hasOwnProperty.call(query, key)) {
          const element = query[key];

          switch (typeof element) {
            case 'boolean':
              queryParam = queryParam.concat(key);
              break;

            default:
              queryParam = queryParam.concat(`&${key}=${encodeURIComponent(element)}`);
              break;
          }
        }
      }

      return queryParam;
    }
  }

  /**
   * The `delay` function in TypeScript returns a Promise that resolves after a specified number of
   * milliseconds.
   * @param {number} ms - The `ms` parameter represents the number of milliseconds for which the delay
   * should occur before the `Promise` is resolved.
   * @returns A Promise that resolves after the specified delay in milliseconds.
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }
}
