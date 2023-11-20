import config from '../config';
import { ConfigType, LogFn } from './utils';

type ContentTypeSchemaType =
  | ReferenceFieldDataType
  | GlobalFieldDataType
  | CustomFieldDataType
  | JsonRTEFieldDataType
  | GroupFieldDataType
  | ModularBlocksDataType;

type ContentTypeStruct = {
  uid: string;
  title: string;
  description: string;
  schema?: ContentTypeSchemaType[];
};

type ModuleConstructorParam = {
  log: LogFn;
  fix?: boolean
  config: ConfigType;
  moduleName?: keyof typeof config.moduleConfig;
};

type CtConstructorParam = {
  gfSchema: ContentTypeStruct[] | [];
  ctSchema: ContentTypeStruct[] | [];
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
  fixStatus?: string
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
  reference_to?: string;
  schema: GlobalFieldSchemaTypes[];
};

// NOTE Type 3
type CustomFieldDataType = CommonDataTypeStruct & {
  reference_to: string[];
  extension_uid: string;
};

// NOTE Type 4
type JsonRTEFieldDataType = CommonDataTypeStruct & {
  reference_to: string[];
};

// NOTE Type 5
type GroupFieldDataType = CommonDataTypeStruct & {
  schema: GroupFieldSchemaTypes[];
};

// NOTE Type 6
type ModularBlockType = {
  uid: string;
  title: string;
  reference_to?: string;
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
type GroupFieldSchemaTypes = GroupFieldDataType | CommonDataTypeStruct | GlobalFieldDataType | ReferenceFieldDataType;

type GlobalFieldSchemaTypes = ReferenceFieldDataType | GroupFieldDataType | CustomFieldDataType;

type ModularBlocksSchemaTypes = ReferenceFieldDataType | JsonRTEFieldDataType;

enum OutputColumn {
  Title = 'name',
  'Field name' = 'display_name',
  'Field type' = 'data_type',
  'Missing references' = 'missingRefs',
  Path = 'treeStr'
}

export {
  CtConstructorParam,
  ContentTypeStruct,
  ModuleConstructorParam,
  ReferenceFieldDataType,
  GlobalFieldDataType,
  CustomFieldDataType,
  JsonRTEFieldDataType,
  GroupFieldDataType,
  ModularBlocksDataType,
  RefErrorReturnType,
  ModularBlocksSchemaTypes,
  ModularBlockType,
  OutputColumn,
  ContentTypeSchemaType,
  GlobalFieldSchemaTypes,
};
