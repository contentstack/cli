import {
  HttpRequestConfig
} from '@contentstack/cli-utilities';

export interface AnyProperty {
  [propName: string]: any;
}

export type APIConfig = HttpRequestConfig & {
  httpClient: boolean;
};

export type VariantsOption = {
  skip: number;
  limit: number;
  locale?: string;
  entry_uid: string;
  content_type_uid: string;
  include_variant?: boolean;
} & AnyProperty;

export type VariantOptions = VariantsOption & {
  variant_uid: string;
};

export interface Variant {
  entryVariant(options: VariantOptions): Promise<{ entry: Record<string, any> }>;

  entryVariants(options: VariantsOption): Promise<{ entries?: Record<string, any>[] | unknown[] }>;
}
