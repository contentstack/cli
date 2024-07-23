import { AnyProperty } from './utils';
import { ImportConfig } from './import-config';

export type ContentTypeStruct = {
  uid: string;
  title: string;
  description: string;
  schema: AnyProperty[];
  options: AnyProperty;
} & AnyProperty;

export type ImportHelperMethodsConfig = {
  lookupAssets: (
    data: Record<string, any>,
    mappedAssetUids: Record<string, any>,
    mappedAssetUrls: Record<string, any>,
    assetUidMapperPath: string,
    installedExtensions: Record<string, any>[],
  ) => any;
  lookupExtension?: (config: ImportConfig, schema: any, preserveStackVersion: any, installedExtensions: any) => void;
  restoreJsonRteEntryRefs: (
    entry: Record<string, any>,
    sourceStackEntry: any,
    ctSchema: any,
    { uidMapper, mappedAssetUids, mappedAssetUrls }: any,
  ) => Record<string, any>;
  lookupEntries: (
    data: {
      content_type: any;
      entry: any;
    },
    mappedUids: Record<string, any>,
    uidMapperPath: string,
  ) => any;
  lookUpTerms: (
    ctSchema: Record<string, any>[],
    entry: any,
    taxonomiesAndTermData: Record<string, any>,
    importConfig: ImportConfig,
  ) => void;
};
