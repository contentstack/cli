import { ConfigType, LogFn } from './utils';

type ContentTypeStruct = {
  uid: string;
  title: string;
  description: string;
  schema: (
    | ReferenceFieldDataType
    | GlobalFieldDataType
    | CustomFieldDataType
    | JsonRTEFieldDataType
    | GroupFieldDataType
    | ModularBlocksDataType
  )[];
};

type ModuleConstructorParam = {
  log: LogFn;
  config: ConfigType;
};

type CommonDataTypeStruct = {
  uid: string;
  data_type: string;
  display_name: string;
  field_metadata: {
    extension: boolean;
    ref_multiple: boolean;
    allow_json_rte: boolean;
  } & Record<string, unknown>;
};

type RefErrorReturnType = {
  name: string;
  ct_uid: string;
  treeStr: string;
  data_type: string;
  missingRefs: string[];
  display_name: string;
  tree: Record<string, unknown>[];
};

// NOTE Type 1
type ReferenceFieldDataType = CommonDataTypeStruct & {
  reference_to: string[];
};

// NOTE Type 2
type GlobalFieldDataType = CommonDataTypeStruct & {
  reference_to: string[];
  schema: GlobalFieldSchemTypes[];
};

// NOTE Type 3
type CustomFieldDataType = CommonDataTypeStruct & {};

// NOTE Type 4
type JsonRTEFieldDataType = CommonDataTypeStruct & {
  reference_to: string[];
};

// NOTE Type 5
type GroupFieldDataType = CommonDataTypeStruct & {
  schema: GroupFieldSchemTypes[];
};

// NOTE Type 6
type ModularBlockType = {
  uid: string;
  title: string;
  schema: (
    | JsonRTEFieldDataType
    | ModularBlocksDataType
    | ReferenceFieldDataType
    | CustomFieldDataType
    | GroupFieldDataType
  )[];
};

type ModularBlocksDataType = CommonDataTypeStruct & {
  blocks: ModularBlockType[];
};

// NOTE It can have following field types global, Custom, json/json rte, reference
type GroupFieldSchemTypes = CommonDataTypeStruct | GlobalFieldDataType | ReferenceFieldDataType;

type GlobalFieldSchemTypes = ReferenceFieldDataType | GroupFieldDataType | CustomFieldDataType;

type ModularBlocksSchemTypes = ReferenceFieldDataType | JsonRTEFieldDataType;

export {
  ContentTypeStruct,
  ModuleConstructorParam,
  ReferenceFieldDataType,
  GlobalFieldDataType,
  CustomFieldDataType,
  JsonRTEFieldDataType,
  GroupFieldDataType,
  ModularBlocksDataType,
  RefErrorReturnType,
  ModularBlocksSchemTypes,
  ModularBlockType,
};
