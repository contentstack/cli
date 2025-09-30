import pick from 'lodash/pick';
import { HttpClient, HttpClientOptions, HttpRequestConfig } from '@contentstack/cli-utilities';

import messages, { $t } from '../messages';
import { APIConfig, AdapterHelperInterface } from '../types';

export class AdapterHelper<C, ApiClient> implements AdapterHelperInterface<C, ApiClient> {
  public readonly config: C;
  public readonly $t: typeof $t;
  public readonly apiClient: ApiClient;
  public readonly cmaAPIClient?: ApiClient;
  public readonly messages: typeof messages;

  constructor(public readonly adapterConfig: APIConfig, options?: HttpClientOptions) {
    this.$t = $t;
    this.messages = messages;
    this.config = adapterConfig.config as C;
    delete this.adapterConfig.config;
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
    this.apiClient = new HttpClient(pick(adapterConfig, pickConfig), options) as ApiClient;
    
    // Add delay interceptor if configured
    if (adapterConfig.delayMs) {
      
      (this.apiClient as any).interceptors?.request?.use(async (requestConfig: any) => {
        await this.delay(adapterConfig.delayMs!);
        return requestConfig;
      });
      
      // Create CMA client if configured
      if (adapterConfig.cmaConfig) {
        this.cmaAPIClient = new HttpClient(pick(adapterConfig.cmaConfig, pickConfig), options) as ApiClient;
        
        // Add delay interceptor to CMA client (no inner condition needed)
        (this.cmaAPIClient as any).interceptors?.request?.use(async (requestConfig: any) => {
          await this.delay(adapterConfig.delayMs!);
          return requestConfig;
        });
      }
    } else if (adapterConfig.cmaConfig) {
      // Create CMA client without delay
      this.cmaAPIClient = new HttpClient(pick(adapterConfig.cmaConfig, pickConfig), options) as ApiClient;
    }
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
