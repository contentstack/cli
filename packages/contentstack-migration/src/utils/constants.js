'use strict';

exports.mapObject = new Map();

exports.version = 3; // TODO: Fetch it from CMA

exports.defaultDataType = 'text';

exports.MANAGEMENT_SDK = 'MANAGEMENT_SDK';
exports.MANAGEMENT_CLIENT = 'MANAGEMENT_CLIENT';
exports.MANAGEMENT_TOKEN = 'MANAGEMENT_TOKEN';
exports.AUTH_TOKEN = 'AUTH_TOKEN';
exports.API_KEY = 'API_KEY';
exports.BRANCH = 'BRANCH';
exports.SOURCE_BRANCH = 'SOURCE_BRANCH';

exports.data_type = 'data_type';
exports.mandatory = 'mandatory';
exports._default = 'default';
exports.unique = 'unique';
exports.display_name = 'display_name';
exports.reference_to = 'reference_to';
exports.field_metadata = 'field_metadata';
exports.taxonomies = 'taxonomies';
exports.multiple = 'multiple';

exports.actions = {
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
exports.MAX_RETRY = 3;

// This key holds the value for http objects in map
exports.requests = 'REQUESTS';

exports.limit = 1; // Limit for concurrent tasks executed parallely

exports.nonWritableMethods = ['GET', 'DELETE'];

exports.ContentType = 'Content type';
exports.Entry = 'Entry';

exports.errorMessageHandler = {
  POST: 'saving',
  GET: 'fetching',
  PUT: 'updating',
  DELETE: 'deleting',
};

exports.successMessageHandler = {
  POST: 'saved',
  GET: 'fetched',
  PUT: 'updated',
  DELETE: 'deleted',
};
// map key
exports.actionMapper = 'actions';

exports.batchLimit = 20;

exports.contentTypeProperties = ['description', 'title', 'uid', 'options', 'force', 'schema'];

exports.validationAction = {
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

exports.transformEntriesProperties = [
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

exports.deriveLinkedEntriesProperties = [
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

exports.transformEntriesToTypeProperties = [
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

exports.SDK_ACTIONS = {
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
