import { AnyProperty } from './common';

type Locale = {
  uid: string;
  code: string;
  name: string;
  fallback_locale: string | null;
};

type EntryStruct = {
  uid: string;
  title: string;
  publish_details: []
} & {
  [key: string]:
    | EntryReferenceFieldDataType[]
    | EntryGlobalFieldDataType
    | EntryJsonRTEFieldDataType
    | EntryGroupFieldDataType
    | EntryModularBlocksDataType[];
};

// NOTE Type 1
type EntryReferenceFieldDataType = {
  uid: string;
  _content_type_uid: string;
};

// NOTE Type 2
type EntryGlobalFieldDataType = {
  [key: string]: EntryStruct;
};

// NOTE Type 3
type EntryExtensionOrAppFieldDataType = {
  [key: string]: {
    uid: string;
    metadata: { extension_uid: string } & AnyProperty;
  };
};

// NOTE Type 4
type EntryJsonRTEFieldDataType = {
  uid: string;
  attrs: Record<string, any>;
  children: EntryJsonRTEFieldDataType[];
};

// NOTE Type 5
type GroupFieldType = EntryReferenceFieldDataType[] | EntryGlobalFieldDataType | EntryJsonRTEFieldDataType ;

type EntryGroupFieldDataType = {
  [key: string]: GroupFieldType;
};

type SelectValue =   string | string [] | number | number;

type EntrySelectFeildDataType = {
  [key: string]: SelectValue
}
// NOTE Type 6
type EntryModularBlockType = {
  [key: string]:
    | EntryJsonRTEFieldDataType
    | EntryModularBlocksDataType
    | EntryReferenceFieldDataType[]
    | EntryGroupFieldDataType;
};

type EntryModularBlocksDataType = {
  [key: string]: EntryModularBlockType;
};

type EntryRefErrorReturnType = {
  name: string;
  uid: string;
  treeStr: string;
  data_type: string;
  fixStatus?: string;
  display_name: string;
  tree: Record<string, unknown>[];
  missingRefs: string[] | Record<string, unknown>[];
};

type EntryFieldType =
  | EntryStruct
  | EntryGlobalFieldDataType
  | EntryModularBlocksDataType
  | EntryGroupFieldDataType
  | EntryExtensionOrAppFieldDataType
  | EntrySelectFeildDataType
  | { [key: string]: any };

export {
  Locale,
  EntryStruct,
  EntryFieldType,
  EntryGlobalFieldDataType,
  EntryExtensionOrAppFieldDataType,
  EntryJsonRTEFieldDataType,
  EntryGroupFieldDataType,
  EntryModularBlocksDataType,
  EntryReferenceFieldDataType,
  EntryRefErrorReturnType,
  GroupFieldType,
  EntryModularBlockType,
  EntrySelectFeildDataType,
  SelectValue
};
