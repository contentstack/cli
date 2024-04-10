import { AnyProperty } from './utils';

export type VariantEntryStruct = {
  uid: string;
  title: string;
  variant_id: string;
  locale: string;
  _version: number;
  _variant: {
    uid: string;
    _change_set: string[];
    _base_entry_version: number;
  };
} & AnyProperty;

export type EntryDataForVariantEntries = {
  content_type: string;
  locale: string;
  entry_uid: string;
};

export type CreateVariantEntryDto = {
  title: string;
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