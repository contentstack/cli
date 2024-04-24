import omit from 'lodash/omit';
import { existsSync } from 'fs';
import {
  HttpClient,
  HttpResponse,
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
} from '@contentstack/cli-utilities';

import {
  APIConfig,
  AdapterType,
  AnyProperty,
  ExportConfig,
  ImportConfig,
  VariantOptions,
  VariantsOption,
  VariantInterface,
  VariantEntryStruct,
  CreateVariantEntryDto,
  CreateVariantEntryOptions,
} from '../types';
import messages from '../messages';
import { AdapterHelper } from './adapter-helper';

export class VariantHttpClient<C> extends AdapterHelper<C, HttpClient> implements VariantInterface<C, HttpClient> {
  public baseURL: string
  constructor(config: APIConfig, options?: HttpClientOptions) {
    super(config, options);
    this.baseURL = config.baseURL?.includes('http') ? `${config.baseURL}/v3` : `https://${config.baseURL}/v3`;
    this.apiClient.baseUrl(this.baseURL);
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
    const variantConfig = (this.config as ExportConfig).modules.variantEntry;
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
    const response = (await this.apiClient.get(endpoint)).data;

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
   * The function `createVariantEntry` creates a new variant entry using the provided input and
   * options.
   * @param {CreateVariantEntryDto} input - The `input` parameter in the `createVariantEntry` function
   * is of type `CreateVariantEntryDto`. This parameter likely contains the data needed to create a new
   * variant entry, such as the fields and values for the variant entry.
   * @param {CreateVariantEntryOptions} options - The `options` parameter contains the following
   * properties:
   * @returns The function `createVariantEntry` is returning a POST request to the specified endpoint
   * with the input data provided in the `CreateVariantEntryDto` parameter. The response is expected to
   * be of type `VariantEntryStruct`.
   */
  createVariantEntry(input: CreateVariantEntryDto, options: CreateVariantEntryOptions) {
    const variantConfig = (this.config as ImportConfig).modules.variantEntry;
    const { locale = variantConfig.query.locale || 'en-us', variant_id, entry_uid, content_type_uid } = options;
    let endpoint = `content_types/${content_type_uid}/entries/${entry_uid}/variants/${variant_id}?locale=${locale}`;

    const query = this.constructQuery(omit(variantConfig.query, ['locale']));

    if (query) {
      endpoint = endpoint.concat(query);
    }

    return this.apiClient.post<VariantEntryStruct>(endpoint, input);
  }
}

export class VariantManagementSDK<T>
  extends AdapterHelper<T, ContentstackClient>
  implements VariantInterface<T, ContentstackClient>
{
  public override apiClient!: ContentstackClient;

  async init(): Promise<void> {
    this.apiClient = await managementSDKClient(this.config);
  }

  async variantEntry(options: VariantOptions) {
    // TODO SDK implementation
    return { entry: {} };
  }

  async variantEntries(options: VariantsOption) {
    // TODO SDK implementation
    return { entries: [{}] };
  }

  createVariantEntry(input: CreateVariantEntryDto, options: CreateVariantEntryOptions): Promise<HttpResponse<VariantEntryStruct>> {
    // FIXME placeholder
    return new HttpClient().post<VariantEntryStruct>('/', input);
  }

  constructQuery(query: Record<string, any>): string | void {}

  async delay(ms: number): Promise<void> {}
}

export class VariantAdapter<T> {
  protected variantInstance;
  public readonly messages: typeof messages;

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

    this.messages = messages;
  }
}

export default VariantAdapter;
