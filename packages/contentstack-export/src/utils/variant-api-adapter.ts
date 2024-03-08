import omit from 'lodash/omit';
import {
  HttpClient,
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
} from '@contentstack/cli-utilities';

import config from '../config';
import { APIConfig, VariantOptions, VariantsOption } from '../types';

class VariantHttpClient implements Variant {
  public baseURL: string;
  public httpClient: HttpClient;

  constructor(public readonly config: APIConfig, options?: HttpClientOptions) {
    this.baseURL = `https://${config.baseURL}/v3`;
    this.httpClient = new HttpClient(config, options);
  }

  async entryVariant(options: VariantOptions) {
    // TODO single entry variant
    return { entry: {} };
  }

  /**
   * This TypeScript function retrieves entry variants based on the provided options and updates the
   * entries array accordingly.
   * @param {VariantsOption} options - The `options` parameter in the `entryVariants` function is an
   * object that contains the following properties:
   * @param {Record<string, any>[]} [entries] - The `entries` parameter in the `entryVariants` function
   * is an optional array of objects. It is used to store the entries retrieved from the API response
   * and is passed recursively to fetch all variants of a particular entry. If `entries` is not
   * provided initially, an empty array will be used
   * @returns The function `entryVariants` returns a Promise that resolves to an object containing the
   * `entries` property, which is an array of Record<string, any> objects or unknown[] array.
   */
  async entryVariants(
    options: VariantsOption,
    entries?: Record<string, any>[],
  ): Promise<{ entries?: Record<string, any>[] | unknown[] }> {
    const variantConfig = config.modules.entryVariant;
    const {
      entry_uid,
      content_type_uid,
      skip = variantConfig.query.skip || 0,
      limit = variantConfig.query.limit || 100,
      locale = variantConfig.query.locale || 'en-us',
      include_variant = variantConfig.query.include_variant || true,
    } = options;
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

    entries = entries.concat(response.entries);

    if (entries.length < response.count) {
      options.skip += 100;
      return await this.entryVariants(options, entries);
    }

    return { entries };
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
}

class VariantManagementSDK implements Variant {
  public sdkClient: ContentstackClient;

  constructor(public readonly config: ContentstackConfig | Record<string, unknown>) {}

  async init(): Promise<void> {
    this.sdkClient = await managementSDKClient(this.config);
  }

  async entryVariant(options: VariantOptions) {
    // TODO SDK implementation
    return { entry: {} };
  }

  async entryVariants(options: VariantsOption) {
    // TODO SDK implementation
    return { entries: [{}] };
  }
}

class Variant {
  constructor(config: ContentstackConfig | Record<string, any>);
  constructor(config: APIConfig, options?: HttpClientOptions) {
    let variantInstance: VariantHttpClient | VariantManagementSDK;

    if (config.httpClient) {
      delete config.httpClient;
      variantInstance = new VariantHttpClient(config, options);
    } else {
      variantInstance = new VariantManagementSDK(config);
    }

    return variantInstance;
  }
}

export default Variant;
