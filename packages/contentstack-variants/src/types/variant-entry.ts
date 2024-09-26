import { AnyProperty } from './utils';

export type VariantEntryStruct = {
  uid: string;
  title: string;
  locale: string;
  _version: number;
  _variant: {
    _uid: string;
    _instance_uid: string;
    _change_set: string[];
    _base_entry_version: number;
  };
  publish_details: Record<string, any>[];
} & AnyProperty;

type PublishDetails = {
  environment: string;
  locale: string;
  time: string;
  user: string;
  version: number;
} & AnyProperty;

export type EntryDataForVariantEntries = {
  content_type: string;
  locale: string;
  entry_uid: string;
};

export type CreateVariantEntryDto = {
  _variant: {
    _change_set: string[];
  };
} & AnyProperty;

export type CreateVariantEntryOptions = {
  locale?: string;
  entry_uid: string;
  variant_id: string;
  content_type_uid: string;
};

export type PublishVariantEntryOptions = {
  entry_uid: string;
  content_type_uid: string;
};

export type PublishVariantEntryDto = {
  entry: {
    environments: string[];
    locales: string[];
    publish_with_base_entry: boolean;
    variants: {
      uid: string;
      version?: number;
    }[];
  }
  locale: string;
  version?: number;
} & AnyProperty;