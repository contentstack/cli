import omit from 'lodash/omit';
import { existsSync } from 'fs';
import {
  HttpClient,
  HttpResponse,
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
  authenticationHandler,
  log,
  CLIProgressManager,
  configHandler,
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
  public exportConfig?: ExportConfig;

  constructor(config: APIConfig, options?: HttpClientOptions) {
    super(config, options);
    this.baseURL = config.baseURL?.includes('http') ? `${config.baseURL}/v3` : `https://${config.baseURL}/v3`;
    this.apiClient.baseUrl(this.baseURL);
    log.debug(`VariantHttpClient initialized with base URL: ${this.baseURL}`, this.exportConfig?.context);
  }

  async init(): Promise<void> {
    log.debug('Initializing VariantHttpClient...', this.exportConfig?.context);
    await authenticationHandler.getAuthDetails();
    const token = authenticationHandler.accessToken;
    log.debug(
      `Authentication type: ${authenticationHandler.isOauthEnabled ? 'OAuth' : 'Token'}`,
      this.exportConfig?.context,
    );
    if (authenticationHandler.isOauthEnabled) {
      log.debug('Setting OAuth authorization header...', this.exportConfig?.context);
      this.apiClient.headers({ authorization: token });
    } else {
      log.debug('Setting authtoken header...', this.exportConfig?.context);
      this.apiClient.headers({ authtoken: token });
    }
  }

  async variantEntry(options: VariantOptions) {
    log.debug('VariantEntry method called (placeholder implementation)', { module: 'variant-api-adapter' });
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

    log.debug(
      `Fetching variant entries for content type: ${content_type_uid}, entry: ${entry_uid}, locale: ${locale}`,
      this.exportConfig?.context,
    );
    log.debug(
      `Query parameters - skip: ${skip}, limit: ${limit}, include_variant: ${include_variant}, include_count: ${include_count}, include_publish_details: ${include_publish_details}`,
      this.exportConfig?.context,
    );

    if (variantConfig.serveMockData && callback) {
      log.debug('Using mock data for variant entries...', this.exportConfig?.context);
      let data = [] as Record<string, any>[];

      if (existsSync(variantConfig.mockDataPath)) {
        log.debug(`Loading mock data from: ${variantConfig.mockDataPath}`, this.exportConfig?.context);
        data = require(variantConfig.mockDataPath) as Record<string, any>[];
      }
      callback(data);
      return;
    }
    if (!locale) {
      log.debug('No locale provided, skipping variant entries fetch', this.exportConfig?.context);
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

    log.debug(`Making API call to: ${endpoint}`, this.exportConfig?.context);
    const data = await this.apiClient.get(endpoint);
    const response = (await this.handleVariantAPIRes(data)) as { entries: VariantEntryStruct[]; count: number };

    if (response?.entries?.length) {
      log.debug(
        `Received ${response.entries?.length} variant entries out of total ${response.count}`,
        this.exportConfig?.context,
      );
    }

    if (callback) {
      log.debug('Executing callback with variant entries...', this.exportConfig?.context);
      callback(response.entries);
    } else {
      log.debug('Adding variant entries to collection...', this.exportConfig?.context);
      entries = entries.concat(response.entries);
    }

    if (getAllData && skip + limit < response.count) {
      const end = Date.now();
      const exeTime = end - start;

      if (exeTime < 1000) {
        // 1 API call per second
        log.debug(`Rate limiting: waiting ${1000 - exeTime}ms before next request`, this.exportConfig?.context );
        await this.delay(1000 - exeTime);
      }
      if (!options.skip) {
        options['skip'] = 0;
      }

      options.skip += limit;
      log.debug(`Continuing to fetch variant entries with skip: ${options.skip}`, this.exportConfig?.context );
      return await this.variantEntries(options, entries);
    }

    if (returnResult) {
      log.debug('Returning variant entries result...', this.exportConfig?.context );
      return { entries };
    }
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
    const { reject, resolve, variantUid } = apiParams;
    const variantConfig = (this.config as ImportConfig).modules.variantEntry;
    const { locale = variantConfig.query.locale || 'en-us', variant_id, entry_uid, content_type_uid } = options;

    log.debug(
      `Creating variant entry for content type: ${content_type_uid}, entry: ${entry_uid}, variant: ${variant_id}`,
      this.exportConfig?.context,
    );

    let endpoint = `content_types/${content_type_uid}/entries/${entry_uid}/variants/${variant_id}?locale=${locale}`;

    const query = this.constructQuery(omit(variantConfig.query, ['locale']));

    if (query) {
      endpoint = endpoint.concat(query);
    }

    log.debug(`Making API call to: ${endpoint}`, this.exportConfig?.context);

    const onSuccess = (response: any) => {
      resolve({ response, apiData: { variantUid, entryUid: entry_uid }, log });
    };
    const onReject = (error: any) => {
      reject({
        error,
        apiData: { variantUid, entryUid: entry_uid },
        log,
      });
    };

    try {
      this.apiClient.headers({ api_version: undefined });
      const res = await this.apiClient.put<VariantEntryStruct>(endpoint, { entry: input });
      const data = await this.handleVariantAPIRes(res);

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
    const { reject, resolve, variantUid } = apiParams;
    const { entry_uid, content_type_uid } = options;

    log.debug(
      `Publishing variant entry for content type: ${content_type_uid}, entry: ${entry_uid}`,
      this.exportConfig?.context,
    );

    let endpoint = `content_types/${content_type_uid}/entries/${entry_uid}/publish`;

    log.debug(`Making API call to: ${endpoint}`, this.exportConfig?.context);

    const onSuccess = (response: any) => {
      log.debug(`Variant entry published successfully: ${entry_uid}`, this.exportConfig?.context );
      resolve({ response, apiData: { entryUid: entry_uid, variantUid, locales: input.entry.locales }, log });
    };
    const onReject = (error: any) => {
      log.debug(`Failed to publish variant entry: ${entry_uid}`, this.exportConfig?.context );
      reject({
        error,
        apiData: { entryUid: entry_uid, variantUid, locales: input.entry.locales },
        log,
      });
    };

    try {
      this.apiClient.headers({ api_version: 3.2 });
      const res = await this.apiClient.post<any>(endpoint, input);
      const data = await this.handleVariantAPIRes(res);

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
  async handleVariantAPIRes(
    res: APIResponse,
  ): Promise<VariantEntryStruct | { entries: VariantEntryStruct[]; count: number } | string | any> {
    const { status, data } = res;
    log.debug(`API response status: ${status}`, this.exportConfig?.context);

    if (status >= 200 && status < 300) {
      log.debug('API request successful.', this.exportConfig?.context);
      return data;
    }

    log.debug(`API request failed with status: ${status}`, this.exportConfig?.context);
    // Refresh the access token if the response status is 401
    await authenticationHandler.refreshAccessToken(res);

    const errorMsg = data?.errors ? formatErrors(data.errors) : data?.error_message || data?.message || data;

    log.debug(`API error: ${errorMsg}`, this.exportConfig?.context);
    throw errorMsg;
  }
}

export class VariantManagementSDK<T>
  extends AdapterHelper<T, ContentstackClient>
  implements VariantInterface<T, ContentstackClient>
{
  public override apiClient!: ContentstackClient;
  public exportConfig?: any;

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

  async handleVariantAPIRes(
    res: APIResponse,
  ): Promise<VariantEntryStruct | { entries: VariantEntryStruct[]; count: number } | string> {
    return res.data;
  }

  constructQuery(query: Record<string, any>): string | void {
    log.debug('ConstructQuery method called (SDK placeholder implementation)', this.exportConfig?.context);
  }

  async delay(ms: number): Promise<void> {
    log.debug(`Delay method called for ${ms}ms (SDK placeholder implementation)`, this.exportConfig?.context);
  }
}

export class VariantAdapter<T> {
  protected variantInstance;
  public readonly messages: typeof messages;
  public exportConfig?: any;
  protected progressManager: CLIProgressManager | null = null;
  protected parentProgressManager: CLIProgressManager | null = null;
  protected currentModuleName: string = '';

  constructor(config: ContentstackConfig & AnyProperty & AdapterType<T, ContentstackConfig>);
  constructor(config: APIConfig & AdapterType<T, APIConfig & AnyProperty>, options?: HttpClientOptions);
  constructor(
    config: APIConfig & AdapterType<T, (APIConfig & AnyProperty) | ContentstackConfig>,
    options?: HttpClientOptions,
  ) {
    log.debug('Initializing VariantAdapter...', this.exportConfig?.context);

    if (config.httpClient) {
      log.debug('Using HTTP client variant instance.', this.exportConfig?.context);
      const { httpClient, Adapter, ...restConfig } = config;
      this.variantInstance = new Adapter(restConfig, options);
    } else {
      log.debug('Using SDK variant instance.', this.exportConfig?.context);
      const { Adapter, ...restConfig } = config;
      this.variantInstance = new Adapter(restConfig);
    }

    this.messages = messages;
    log.debug('VariantAdapter initialized successfully.', this.exportConfig?.context);
  }

  /**
   * Set parent progress manager for sub-module integration
   */
  public setParentProgressManager(parentProgress: CLIProgressManager): void {
    this.parentProgressManager = parentProgress;
    this.progressManager = parentProgress;
  }

  /**
   * Create simple progress manager for single process tracking
   */
  protected createSimpleProgress(moduleName: string, total?: number): CLIProgressManager {
    this.currentModuleName = moduleName;
    
    // If we have a parent progress manager, use it instead of creating a new one
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.progressManager;
    }
    
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createSimple(moduleName, total, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Create nested progress manager for multi-process tracking
   */
  protected createNestedProgress(moduleName: string): CLIProgressManager {
    this.currentModuleName = moduleName;
    
    // If we have a parent progress manager, use it instead of creating a new one
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.progressManager;
    }
    
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createNested(moduleName, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Complete progress manager
   */
  protected completeProgress(success: boolean = true, error?: string): void {
    // Only complete progress if we own the progress manager (no parent)
    if (!this.parentProgressManager) {
      this.progressManager?.complete(success, error);
    }
    this.progressManager = null;
  }

  /**
   * Execute action with loading spinner for initial setup tasks
   */
  protected async withLoadingSpinner<T>(message: string, action: () => Promise<T>): Promise<T> {
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;

    if (showConsoleLogs) {
      // If console logs are enabled, don't show spinner, just execute the action
      return await action();
    }
    return await CLIProgressManager.withLoadingSpinner(message, action);
  }

  /**
   * Update progress for a specific item
   */
  protected updateProgress(success: boolean, itemName: string, error?: string, processName?: string): void {
    this.progressManager?.tick(success, itemName, error, processName);
  }
}

export default VariantAdapter;