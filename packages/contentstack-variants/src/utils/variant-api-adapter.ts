import omit from 'lodash/omit';
import pick from 'lodash/pick';
import {
  HttpClient,
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
  HttpRequestConfig,
} from '@contentstack/cli-utilities';

import { ExportConfig } from '@contentstack/cli-cm-export/lib/types';
import { APIConfig, AdapterType, AnyProperty, Variant, VariantOptions, VariantsOption } from '../types';

export class VariantHttpClient implements Variant {
  public baseURL: string;
  public httpClient: HttpClient;
  public sharedConfig!: ExportConfig | Record<string, any>;

  constructor(public readonly config: APIConfig, options?: HttpClientOptions) {
    this.sharedConfig = config.sharedConfig || {};
    this.baseURL = config.baseURL?.includes('http') ? `${config.baseURL}/v3` : `https://${config.baseURL}/v3`;
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

  async variantEntry(options: VariantOptions) {
    // TODO single entry variant
    return { entry: {} };
  }

  /**
   * The function `variantEntries` retrieves variant entries based on specified options and stores them
   * in an array.
   * @param {VariantsOption} options - The `options` parameter in the `variantEntries` function is an
   * object that contains the following properties:
   * @param {Record<string, any>[]} entries - The `entries` parameter in the `variantEntries` function
   * is an array of objects where each object represents a record with key-value pairs. This parameter
   * is used to store the entries retrieved from the API response or passed down recursively when
   * fetching all data.
   * @returns The function `variantEntries` returns a Promise that resolves to an object with an
   * `entries` property containing an array of record objects or an unknown array. The function can
   * also return void if certain conditions are not met.
   */
  async variantEntries(
    options: VariantsOption,
    entries: Record<string, any>[] = [],
  ): Promise<{ entries?: Record<string, any>[] | unknown[] } | void> {
    const variantConfig = this.sharedConfig.modules.variantEntry;
    const {
      callback,
      entry_uid,
      getAllData,
      returnResult,
      content_type_uid,
      skip = variantConfig.query.skip || 0,
      limit = variantConfig.query.limit || 100,
      locale = variantConfig.query.locale || 'en-us',
      include_variant = variantConfig.query.include_variant || true,
    } = options;
    const start = Date.now();
    let endpoint = `${this.baseURL}/content_types/${content_type_uid}/entries/${entry_uid}/variants?locale=${locale}`;

    if (skip) {
      endpoint = endpoint.concat(`&skip=${skip}`);
    }

    if (limit) {
      endpoint = endpoint.concat(`&limit=${limit}`);
    }

    if (include_variant) {
      endpoint.concat('&include_variant');
    }

    const query = this.constructQuery(omit(variantConfig.query, ['skip', 'limit', 'locale', 'include_variant']));

    if (query) {
      endpoint = endpoint.concat(query);
    }

    // FIXME once API is ready addjest the responce accordingly
    const response = (await this.httpClient.get(endpoint)).data;

    if (callback) {
      callback(response.entries);
    } else {
      entries = entries.concat(response.entries);
    }

    if (getAllData && skip + limit < response.count) {
      const end = Date.now();
      const exeTime = end - start;

      if (exeTime < 1000) {
        // 1 API call per second
        await this.delay(1000 - exeTime);
      }
      if (!options.skip) {
        options['skip'] = 0;
      }

      options.skip += limit;
      return await this.variantEntries(options, entries);
    }

    if (returnResult) return { entries };
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

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms <= 0 ? 0 : ms));
  }
}

export class VariantManagementSDK implements Variant {
  public sdkClient!: ContentstackClient;

  constructor(public readonly config: ContentstackConfig | AnyProperty) {}

  async init(): Promise<void> {
    this.sdkClient = await managementSDKClient(this.config);
  }

  async variantEntry(options: VariantOptions) {
    // TODO SDK implementation
    return { entry: {} };
  }

  async variantEntries(options: VariantsOption) {
    // TODO SDK implementation
    return { entries: [{}] };
  }
}

class VariantAPIInstance<T> {
  protected variantInstance;

  constructor(config: ContentstackConfig & AnyProperty & AdapterType<T, ContentstackConfig>);
  constructor(config: APIConfig & AdapterType<T, APIConfig & AnyProperty>, options?: HttpClientOptions);
  constructor(
    config: APIConfig & AdapterType<T, (APIConfig & AnyProperty) | ContentstackConfig>,
    options?: HttpClientOptions,
  ) {
    if (config.httpClient) {
      const { httpClient, Adapter, ...restConfig } = config;
      this.variantInstance = new Adapter(restConfig, options);
    } else {
      const { Adapter, ...restConfig } = config;
      this.variantInstance = new Adapter(restConfig);
    }
  }
}

export default VariantAPIInstance;
