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
  APIResponse,
  PublishVariantEntryDto,
  PublishVariantEntryOptions,
} from '../types';
import messages from '../messages';
import { AdapterHelper } from './adapter-helper';
import { formatErrors } from './error-helper';

export class VariantHttpClient<C> extends AdapterHelper<C, HttpClient> implements VariantInterface<C, HttpClient> {
  public baseURL: string;
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
      locale,
      skip = variantConfig.query.skip || 0,
      limit = variantConfig.query.limit || 100,
      include_variant = variantConfig.query.include_variant || true,
      include_count = variantConfig.query.include_count || true,
      include_publish_details = variantConfig.query.include_publish_details || true,
    } = options;

    if (variantConfig.serveMockData && callback) {
      let data = [] as Record<string, any>[];

      if (existsSync(variantConfig.mockDataPath)) {
        data = require(variantConfig.mockDataPath) as Record<string, any>[];
      }
      callback(data);
      return;
    }
    if (!locale) return;

    const start = Date.now();
    let endpoint = `/content_types/${content_type_uid}/entries/${entry_uid}/variants?locale=${locale}`;

    if (skip) {
      endpoint = endpoint.concat(`&skip=${skip}`);
    }

    if (limit) {
      endpoint = endpoint.concat(`&limit=${limit}`);
    }

    if (include_variant) {
      endpoint = endpoint.concat(`&include_variant=${include_variant}`);
    }

    if (include_count) {
      endpoint = endpoint.concat(`&include_count=${include_count}`);
    }

    if (include_publish_details) {
      endpoint = endpoint.concat(`&include_publish_details=${include_publish_details}`);
    }

    const query = this.constructQuery(
      omit(variantConfig.query, [
        'skip',
        'limit',
        'locale',
        'include_variant',
        'include_count',
        'include_publish_details',
      ]),
    );

    if (query) {
      endpoint = endpoint.concat(query);
    }

    const data = await this.apiClient.get(endpoint);
    const response = this.handleVariantAPIRes(data) as { entries: VariantEntryStruct[]; count: number };

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
   * Creates a variant entry.
   *
   * @param input - The input data for the variant entry.
   * @param options - The options for creating the variant entry.
   * @param apiParams - Additional parameters for the API.
   * @returns A Promise that resolves to a VariantEntryStruct, a string, or void.
   */
  async createVariantEntry(
    input: CreateVariantEntryDto,
    options: CreateVariantEntryOptions,
    apiParams: Record<string, any>,
  ): Promise<VariantEntryStruct | string | void> {
    const { reject, resolve, variantUid, log } = apiParams;
    const variantConfig = (this.config as ImportConfig).modules.variantEntry;
    const { locale = variantConfig.query.locale || 'en-us', variant_id, entry_uid, content_type_uid } = options;
    let endpoint = `content_types/${content_type_uid}/entries/${entry_uid}/variants/${variant_id}?locale=${locale}`;

    const query = this.constructQuery(omit(variantConfig.query, ['locale']));

    if (query) {
      endpoint = endpoint.concat(query);
    }

    const onSuccess = (response: any) => resolve({ response, apiData: { variantUid, entryUid: entry_uid }, log });
    const onReject = (error: any) =>
      reject({
        error,
        apiData: { variantUid, entryUid: entry_uid },
        log,
      });

    try {
      this.apiClient.headers({ api_version: undefined });
      const res = await this.apiClient.put<VariantEntryStruct>(endpoint, { entry: input });
      const data = this.handleVariantAPIRes(res);

      if (res.status >= 200 && res.status < 300) {
        onSuccess(data);
      } else {
        onReject(data);
      }
    } catch (error: any) {
      onReject(error);
    }
  }

  /**
   * Publishes a variant entry.
   *
   * @param input - The input data for publishing the variant entry.
   * @param options - The options for publishing the variant entry.
   * @param apiParams - Additional API parameters.
   * @returns A Promise that resolves to the published variant entry response.
   */
  async publishVariantEntry(
    input: PublishVariantEntryDto,
    options: PublishVariantEntryOptions,
    apiParams: Record<string, any>,
  ) {
    const { reject, resolve, log, variantUid } = apiParams;
    const { entry_uid, content_type_uid } = options;
    let endpoint = `content_types/${content_type_uid}/entries/${entry_uid}/publish`;

    const onSuccess = (response: any) => resolve({ response, apiData: { entryUid: entry_uid, variantUid }, log });
    const onReject = (error: any) =>
      reject({
        error,
        apiData: { entryUid: entry_uid, variantUid },
        log,
      });

    try {
      this.apiClient.headers({ api_version: 3.2 });
      const res = await this.apiClient.post<any>(endpoint, input);
      const data = this.handleVariantAPIRes(res);

      if (res.status >= 200 && res.status < 300) {
        onSuccess(data);
      } else {
        onReject(data);
      }
    } catch (error: any) {
      onReject(error);
    }
  }

  /**
   * Handles the API response for variant requests.
   * @param res - The API response object.
   * @returns The variant API response data.
   * @throws If the API response status is not within the success range, an error message is thrown.
   */
  handleVariantAPIRes(
    res: APIResponse,
  ): VariantEntryStruct | { entries: VariantEntryStruct[]; count: number } | string | any {
    const { status, data } = res;

    if (status >= 200 && status < 300) {
      return data;
    }

    const errorMsg = data?.errors
      ? formatErrors(data.errors)
      : data?.error_message || data?.message || 'Something went wrong while processing entry variant request!';

    throw errorMsg;
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

  createVariantEntry(
    input: CreateVariantEntryDto,
    options: CreateVariantEntryOptions,
    apiParams: Record<string, any>,
  ): Promise<VariantEntryStruct | string | void> {
    // FIXME placeholder
    return Promise.resolve({} as VariantEntryStruct);
  }

  handleVariantAPIRes(
    res: APIResponse,
  ): VariantEntryStruct | { entries: VariantEntryStruct[]; count: number } | string {
    return res.data;
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
