import {
  HttpRequestConfig
} from '@contentstack/cli-utilities';

export type APIConfig = HttpRequestConfig & {
  restClient: boolean;
};

export type VariantsOption = {
  skip: number;
  limit: number;
  locale?: string;
  entry_uid: string;
  content_type_uid: string;
  include_publish_details?: boolean;
};

export type VariantOptions = VariantsOption & {
  variant_uid: string;
};

export interface Variant {
  entryVariant(options: VariantOptions): Promise<{ entry: Record<string, any> }>;

  entryVariants(options: VariantsOption): Promise<{ entries?: Record<string, any>[] | unknown[] }>;
}
