export const mapObject = new Map<string, any>();

export const version = 3; // TODO: Fetch it from CMA

export const defaultDataType = 'text';

export const MANAGEMENT_SDK = 'MANAGEMENT_SDK';
export const MANAGEMENT_CLIENT = 'MANAGEMENT_CLIENT';
export const MANAGEMENT_TOKEN = 'MANAGEMENT_TOKEN';
export const AUTH_TOKEN = 'AUTH_TOKEN';
export const API_KEY = 'API_KEY';
export const BRANCH = 'BRANCH';
export const SOURCE_BRANCH = 'SOURCE_BRANCH';

export const data_type = 'data_type';
export const mandatory = 'mandatory';
export const _default = 'default';
export const unique = 'unique';
export const display_name = 'display_name';
export const reference_to = 'reference_to';
export const field_metadata = 'field_metadata';
export const taxonomies = 'taxonomies';
export const multiple = 'multiple';

export const actions = {
  CUSTOM_TASK: 'CUSTOM_TASK',
  CREATE_CT: 'CREATE_CT',
  DELETE_CT: 'DELETE_CT',
  EDIT_CT: 'EDIT_CT',
  LOCALES: 'LOCALES',
  EDIT_FIELD: 'EDIT_FIELD',
  DELETE_FIELD: 'DELETE_FIELD',
  MOVE_FIELD: 'MOVE_FIELD',
};

// Http call max retry
export const MAX_RETRY = 3;

// This key holds the value for http objects in map
export const requests = 'REQUESTS';

export const limit = 1; // Limit for concurrent tasks executed parallely

export const nonWritableMethods = ['GET', 'DELETE'];

export const ContentType = 'Content type';
export const Entry = 'Entry';

export const errorMessageHandler = {
  POST: 'saving',
  GET: 'fetching',
  PUT: 'updating',
  DELETE: 'deleting',
};

export const successMessageHandler = {
  POST: 'saved',
  GET: 'fetched',
  PUT: 'updated',
  DELETE: 'deleted',
};
// map key
export const actionMapper = 'actions';

export const batchLimit = 20;

export const contentTypeProperties = ['description', 'title', 'uid', 'options', 'force', 'schema'];

export const validationAction = {
  create: 'create',
  edit: 'edit',
  customTask: 'customTask',
  transformEntries: 'transformEntries',
  deriveLinkedEntries: 'deriveLinkedEntries',
  transformEntriesToType: 'transformEntriesToType',
  typeError: 'typeError',
  apiError: 'apiError',
  schema: 'schema',
  __migrationError: 'migrationError',
  field: 'field',
};

export const transformEntriesProperties = [
  {
    name: 'contentType',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'from',
    type: 'array',
    mandatory: true,
  },
  {
    name: 'to',
    type: 'array',
    mandatory: true,
  },
  {
    name: 'shouldPublish',
    type: 'boolean',
    mandatory: false,
    dependsOn: 'environments',
  },
  {
    name: 'environments',
    type: 'array',
    mandatory: false,
  },
  {
    name: 'transformEntryForLocale',
    type: 'function',
    mandatory: true,
  },
];

export const deriveLinkedEntriesProperties = [
  {
    name: 'contentType',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'derivedContentType',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'from',
    type: 'array',
    mandatory: true,
  },
  {
    name: 'toReferenceField',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'derivedFields',
    type: 'array',
    mandatory: true,
  },
  {
    name: 'identityKey',
    type: 'function',
    mandatory: true,
  },
  {
    name: 'shouldPublish',
    type: 'boolean',
    mandatory: false,
    dependsOn: 'environments',
  },
  {
    name: 'environments',
    type: 'array',
    mandatory: false,
  },
  {
    name: 'deriveEntryForLocale',
    type: 'function',
    mandatory: true,
  },
];

export const transformEntriesToTypeProperties = [
  {
    name: 'sourceContentType',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'targetContentType',
    type: 'string',
    mandatory: true,
  },
  {
    name: 'from',
    type: 'array',
    mandatory: true,
  },
  {
    name: 'shouldPublish',
    type: 'boolean',
    mandatory: false,
    dependsOn: 'environments',
  },
  {
    name: 'environments',
    type: 'array',
    mandatory: false,
  },
  {
    name: 'removeOldEntries',
    type: 'boolean',
    mandatory: false,
  },
  {
    name: 'identityKey',
    type: 'function',
    mandatory: true,
  },
  {
    name: 'transformEntryForLocale',
    type: 'function',
    mandatory: true,
  },
];

export const SDK_ACTIONS = {
  CONTENTTYPE_GET: 'CONTENTTYPE_GET',
  CONTENTTYPE_POST: 'CONTENTTYPE_POST',
  CONTENTTYPE_DELETE: 'CONTENTTYPE_GET',
  CONTENTTYPE_PUT: 'CONTENTTYPE_PUT',
  LOCALES_GET: 'LOCALES_GET',
  ENTRY_GET: 'ENTRY_GET',
  ENTRY_POST: 'ENTRY_POST',
  ENTRY_PUT: 'ENTRY_PUT',
  ENTRY_DELETE: 'ENTRY_DELETE',
  ENTRY_PUBLISH: 'ENTRY_PUBLISH',
};
