import omit from 'lodash/omit';
import { existsSync } from 'fs';
import {
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
} from '@contentstack/cli-utilities';

import { APIConfig, AdapterType, AnyProperty, VariantInterface, VariantOptions, VariantsOption } from '../types';
import { AdapterHelper } from './adapter-helper';

export class VariantHttpClient extends AdapterHelper implements VariantInterface {
  constructor(public readonly config: APIConfig, options?: HttpClientOptions) {
    super(config, options);
    const baseURL = config.baseURL?.includes('http') ? `${config.baseURL}/v3` : `https://${config.baseURL}/v3`;
    this.httpClient.baseUrl(baseURL);
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

    if (variantConfig.serveMockData && callback) {
      let data = [] as Record<string, any>[];

      if (existsSync(variantConfig.mockDataPath)) {
        data = require(variantConfig.mockDataPath) as Record<string, any>[];
      }
      callback(data);
      return;
    }

    const start = Date.now();
    let endpoint = `/content_types/${content_type_uid}/entries/${entry_uid}/variants?locale=${locale}`;

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

    // FIXME once API is ready, validate and addjest the responce accordingly
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
}

export class VariantManagementSDK implements VariantInterface {
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

  constructQuery(query: Record<string, any>): string | void {}

  async delay(ms: number): Promise<void> {}
}

export class VariantAdapter<T> {
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

export default VariantAdapter;
