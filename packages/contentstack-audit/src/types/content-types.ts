import config from '../config';
import { AnyProperty } from './common';
import { ConfigType, LogFn } from './utils';

type ContentTypeSchemaType =
  | ReferenceFieldDataType
  | GlobalFieldDataType
  | ExtensionOrAppFieldDataType
  | JsonRTEFieldDataType
  | GroupFieldDataType
  | ModularBlocksDataType
  | SelectFeildStruct;

type ContentTypeStruct = {
  uid: string;
  title: string;
  description: string;
  schema?: ContentTypeSchemaType[];
  mandatory: boolean;
};

type ModuleConstructorParam = {
  log: LogFn;
  fix?: boolean;
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
    ref_multiple: boolean;
    allow_json_rte: boolean;
  } & AnyProperty;
  mandatory: boolean
};

type RefErrorReturnType = {
  name: string;
  ct_uid: string;
  treeStr: string;
  data_type: string;
  fixStatus?: string;
  missingRefs: string[];
  display_name: string;
  tree: Record<string, unknown>[];
  uid?: string;
  content_types?: string[];
  title?: string;
};

type WorkflowExtensionsRefErrorReturnType = RefErrorReturnType & { branches?: string[] };

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
type ExtensionOrAppFieldDataType = Omit<CommonDataTypeStruct, 'field_metadata'> & {
  extension_uid: string;
  field_metadata: { extension: boolean };
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
    | ExtensionOrAppFieldDataType
    | GroupFieldDataType
    | SelectFeildStruct
  )[];
};

type ModularBlocksDataType = CommonDataTypeStruct & {
  blocks: ModularBlockType[];
};

// NOTE It can have following field types global, Custom, json/json rte, reference
type GroupFieldSchemaTypes =
  | GroupFieldDataType
  | CommonDataTypeStruct
  | GlobalFieldDataType
  | ReferenceFieldDataType
  | ExtensionOrAppFieldDataType
  | SelectFeildStruct;

type GlobalFieldSchemaTypes = ReferenceFieldDataType | GroupFieldDataType | ExtensionOrAppFieldDataType | SelectFeildStruct;

type ModularBlocksSchemaTypes = ReferenceFieldDataType | JsonRTEFieldDataType | SelectFeildStruct;

type SelectFeildStruct = CommonDataTypeStruct & {
  display_type:string;
  enum: {
    advanced: string;
    choices: Record<string, unknown>[];
  };
  min_instance?: number;
  max_instance?: number;
  multiple: boolean;
};

enum OutputColumn {
  Title = 'name',
  'Field name' = 'display_name',
  'Field type' = 'data_type',
  'Display type' = 'display_type',
  'Missing references' = 'missingRefs',
  Path = 'treeStr',
  title = 'title',
  'uid' = 'uid',
  'missingCts' = 'content_types',
  'Missing Branches' = 'branches',
  'MissingValues' = 'missingCTSelectFieldValues',
  'Minimum Required Instaces' = 'min_instance',
  'missingFieldUid' = 'missingFieldUid',
  'isPublished' = 'isPublished'
}

export {
  CtConstructorParam,
  ContentTypeStruct,
  ModuleConstructorParam,
  ReferenceFieldDataType,
  GlobalFieldDataType,
  ExtensionOrAppFieldDataType,
  JsonRTEFieldDataType,
  GroupFieldDataType,
  ModularBlocksDataType,
  RefErrorReturnType,
  ModularBlocksSchemaTypes,
  ModularBlockType,
  OutputColumn,
  ContentTypeSchemaType,
  GlobalFieldSchemaTypes,
  WorkflowExtensionsRefErrorReturnType,
  SelectFeildStruct,
};
