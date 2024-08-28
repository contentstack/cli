import { HttpClientOptions, HttpRequestConfig, HttpResponse } from '@contentstack/cli-utilities';

import { APIResponse } from '../types';
import { AnyProperty } from './utils';
import { ExportConfig } from './export-config';
import { AdapterHelperInterface } from './adapter-helper';
import { CreateVariantEntryDto, CreateVariantEntryOptions, VariantEntryStruct } from './variant-entry';

export type APIConfig = HttpRequestConfig & {
  httpClient?: boolean;
  sharedConfig?: ExportConfig | Record<string, any> | undefined;
  personalizeUrl?: string;
  config: ExportConfig | Record<string, any> | undefined;
  baseURL?: string;
  cmaConfig?: HttpRequestConfig;
};

export interface AdapterConstructor<T, C> {
  new (config: C, options?: HttpClientOptions): T;
}

export type AdapterType<T, C> = {
  Adapter: AdapterConstructor<T, C>;
};

export type VariantsOption = {
  skip?: number;
  limit?: number;
  locale?: string;
  entry_uid: string;
  getAllData?: boolean;
  returnResult?: boolean;
  content_type_uid: string;
  include_variant?: boolean;
  include_count?: boolean;
  include_publish_details?: boolean;
  callback?: (value: Record<string, any>[]) => void;
} & AnyProperty;

export type VariantOptions = VariantsOption & {
  variant_uid: string;
};

export interface VariantInterface<T, ApiClient> extends AdapterHelperInterface<T, ApiClient> {
  variantEntry(options: VariantOptions): Promise<{ entry: Record<string, any> }>;

  variantEntries(options: VariantsOption): Promise<{ entries?: Record<string, any>[] | unknown[] } | void>;

  createVariantEntry(
    input: CreateVariantEntryDto,
    options: CreateVariantEntryOptions,
    apiParams: Record<string, any>,
  ): Promise<VariantEntryStruct | string | void>;

  handleVariantAPIRes(res: APIResponse): VariantEntryStruct | { entries: VariantEntryStruct[]; count: number } | string;
}
