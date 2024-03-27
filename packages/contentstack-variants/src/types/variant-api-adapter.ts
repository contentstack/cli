import { HttpClientOptions, HttpRequestConfig } from '@contentstack/cli-utilities';

import { AnyProperty } from './utils';
import { ExportConfig } from './export-config';
import { AdapterHelperInterface } from './adapter-helper';

export type APIConfig = HttpRequestConfig & {
  httpClient?: boolean;
  sharedConfig: ExportConfig | Record<string, any> | undefined;
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
  callback?: (value: Record<string, any>[]) => void;
} & AnyProperty;

export type VariantOptions = VariantsOption & {
  variant_uid: string;
};

export interface VariantInterface extends AdapterHelperInterface {
  variantEntry(options: VariantOptions): Promise<{ entry: Record<string, any> }>;

  variantEntries(options: VariantsOption): Promise<{ entries?: Record<string, any>[] | unknown[] } | void>;
}
