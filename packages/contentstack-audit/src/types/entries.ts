type Locale = {
  uid: string;
  code: string;
  name: string;
  fallback_locale: string | null;
};

type EntryStruct = {
  uid: string;
  title: string;
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
type EntryCustomFieldDataType = {
  [key: string]: EntryStruct;
};

// NOTE Type 4
type EntryJsonRTEFieldDataType = {
  uid: string;
  attrs: Record<string, any>;
  children: EntryJsonRTEFieldDataType[];
};

// NOTE Type 5
type EntryGroupFieldDataType = {
  [key: string]: EntryReferenceFieldDataType[] | EntryGlobalFieldDataType | EntryJsonRTEFieldDataType;
};

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
  missingRefs: string[] | Record<string, unknown>[];
  display_name: string;
  tree: Record<string, unknown>[];
};

export {
  Locale,
  EntryStruct,
  EntryGlobalFieldDataType,
  EntryCustomFieldDataType,
  EntryJsonRTEFieldDataType,
  EntryGroupFieldDataType,
  EntryModularBlocksDataType,
  EntryReferenceFieldDataType,
  EntryRefErrorReturnType,
};
