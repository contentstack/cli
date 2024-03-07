import {
  HttpClient,
  HttpRequestConfig,
  HttpClientOptions,
  ContentstackClient,
  ContentstackConfig,
  managementSDKClient,
} from '@contentstack/cli-utilities';

type APIConfig = HttpRequestConfig & {
  restClient: boolean;
};

type VariantsOption = {
  skip: number;
  limit: number;
  locale?: string;
  entry_uid: string;
  content_type_uid: string;
  include_publish_details?: boolean;
};

type VariantOptions = VariantsOption & {
  variant_uid: string;
};

interface Variant {
  entryVariant(options: VariantOptions): Promise<{ entry: Record<string, any> }>;

  entryVariants(options: VariantsOption): Promise<{ entries?: Record<string, any>[] | unknown[] }>;
}

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
   * This TypeScript function retrieves entry variants based on specified options and concatenates them
   * into an array until all variants are fetched.
   * @param {VariantsOption} options - The `options` parameter in the `entryVariants` function contains
   * the following properties:
   * @param {Record<string, any>[]} [entries] - The `entries` parameter in the `entryVariants` function
   * is an optional array of records. It is used to store the entries retrieved from the API response
   * and is passed recursively to fetch all variants of an entry. If `entries` is provided initially,
   * the retrieved entries will be concatenated to this
   * @returns The function `entryVariants` returns a Promise that resolves to an object containing an
   * array of entries.
   */
  async entryVariants(
    options: VariantsOption,
    entries?: Record<string, any>[],
  ): Promise<{ entries?: Record<string, any>[] | unknown[] }> {
    const { content_type_uid, entry_uid, locale = 'en-us', include_publish_details, skip = 0, limit = 100 } = options;
    let endpoint = `${this.baseURL}/content_types/${content_type_uid}/entries/${entry_uid}/variants?locale=${locale}`;

    if (skip) {
      endpoint = endpoint.concat(`&skip=${skip}`);
    }

    if (limit) {
      endpoint = endpoint.concat(`&limit=${limit}`);
    }

    if (include_publish_details) {
      endpoint.concat('&include_publish_details');
    }

    // FIXME once API is ready addjest the responce accordingly
    const response = (await this.httpClient.get(endpoint)).data;

    entries = entries.concat(response.entries);

    if (entries.length < response.count) {
      return await this.entryVariants(options, entries);
    }

    return { entries };
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

    if (config.restClient) {
      delete config.restClient;
      variantInstance = new VariantHttpClient(config, options);
    } else {
      variantInstance = new VariantManagementSDK(config);
    }

    return variantInstance;
  }
}

export default Variant;
