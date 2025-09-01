export const PROCESS_NAMES = {
  // Assets module
  ASSET_FOLDERS: 'Folders',
  ASSET_VERSIONS: 'Versions',
  ASSET_UPLOAD: 'Upload',
  ASSET_PUBLISH: 'Publish',

  // Content Types module
  CONTENT_TYPES_CREATE: 'Content Types Create',
  CONTENT_TYPES_UPDATE: 'Content Types Update',
  CONTENT_TYPES_REPLACE_EXISTING: 'Content Types Replace Existing',

  // Entries module
  CT_PREPARATION: 'CT Preparation',
  ENTRIES_CREATE: 'Entries Create',
  ENTRIES_REPLACE_EXISTING: 'Entries Replace Existing',
  REFERENCE_UPDATES: 'Reference Updates',
  CT_RESTORATION: 'CT Restoration',
  FIELD_RULES_UPDATE: 'Field Rules Update',
  ENTRIES_PUBLISH: 'Entries Publish',
  CLEANUP: 'Cleanup',

  // Extensions module
  EXTENSIONS_CREATE: 'Extensions Create',
  EXTENSIONS_REPLACE_EXISTING: 'Extensions Replace Existing',

  // Global Fields module
  GLOBAL_FIELDS_CREATE: 'Global Fields Create',
  GLOBAL_FIELDS_UPDATE: 'Global Fields Update',
  GLOBAL_FIELDS_REPLACE_EXISTING: 'Global Fields Replace Existing',

  // Labels module
  LABELS_CREATE: 'Labels Create',
  LABELS_UPDATE: 'Labels Update',

  // Locales module
  MASTER_LOCALE: 'Master Locale',
  LOCALES_CREATE: 'Locales Create',
  LOCALES_UPDATE: 'Locales Update',

  // Marketplace Apps module
  SETUP_ENVIRONMENT: 'Setup Environment',
  CREATE_APPS: 'Create Apps',
  INSTALL_APPS: 'Install Apps',

  // Workflows module
  GET_ROLES: 'Get Roles',
  WORKFLOWS_CREATE: 'Workflows Create',

  // Additional processes for import modules
  VARIANT_ENTRIES_IMPORT: 'Variant Entries Import',
  ENVIRONMENTS_IMPORT: 'Environments Import',
  CUSTOM_ROLES_BUILD_MAPPINGS: 'Custom Roles Build Mappings',
  CUSTOM_ROLES_IMPORT: 'Custom Roles Import',
  STACK_IMPORT: 'Stack Import',
  CONTENT_TYPES_GF_UPDATE: 'Content Types GF Update',
  CONTENT_TYPES_EXT_UPDATE: 'Content Types Ext Update',
  WEBHOOKS_IMPORT: 'Webhooks Import',
  TAXONOMIES_IMPORT: 'Taxonomies Import',
  PERSONALIZE_PROJECTS: 'Projects',
} as const;

export const MODULE_CONTEXTS = {
  ASSETS: 'assets',
  CONTENT_TYPES: 'content-types',
  CUSTOM_ROLES: 'custom-roles',
  ENTRIES: 'entries',
  ENVIRONMENTS: 'environments',
  EXTENSIONS: 'extensions',
  GLOBAL_FIELDS: 'global-fields',
  LABELS: 'labels',
  LOCALES: 'locales',
  MARKETPLACE_APPS: 'marketplace-apps',
  PERSONALIZE: 'personalize',
  STACK: 'stack',
  TAXONOMIES: 'taxonomies',
  VARIANT_ENTRIES: 'variant-entries',
  WEBHOOKS: 'webhooks',
  WORKFLOWS: 'workflows',
} as const;

// Display names for modules to avoid scattering user-facing strings
export const MODULE_NAMES = {
  [MODULE_CONTEXTS.ASSETS]: 'Assets',
  [MODULE_CONTEXTS.CONTENT_TYPES]: 'Content Types',
  [MODULE_CONTEXTS.CUSTOM_ROLES]: 'Custom Roles',
  [MODULE_CONTEXTS.ENTRIES]: 'Entries',
  [MODULE_CONTEXTS.ENVIRONMENTS]: 'Environments',
  [MODULE_CONTEXTS.EXTENSIONS]: 'Extensions',
  [MODULE_CONTEXTS.GLOBAL_FIELDS]: 'Global Fields',
  [MODULE_CONTEXTS.LABELS]: 'Labels',
  [MODULE_CONTEXTS.LOCALES]: 'Locales',
  [MODULE_CONTEXTS.MARKETPLACE_APPS]: 'Marketplace Apps',
  [MODULE_CONTEXTS.PERSONALIZE]: 'Personalize',
  [MODULE_CONTEXTS.STACK]: 'Stack',
  [MODULE_CONTEXTS.TAXONOMIES]: 'Taxonomies',
  [MODULE_CONTEXTS.VARIANT_ENTRIES]: 'Variant Entries',
  [MODULE_CONTEXTS.WEBHOOKS]: 'Webhooks',
  [MODULE_CONTEXTS.WORKFLOWS]: 'Workflows',
} as const;

export const PROCESS_STATUS = {
  // Assets
  [PROCESS_NAMES.ASSET_FOLDERS]: {
    CREATING: 'Creating asset folders...',
    FAILED: 'Failed to create asset folders.',
  },
  [PROCESS_NAMES.ASSET_VERSIONS]: {
    IMPORTING: 'Importing asset versions...',
    FAILED: 'Failed to process asset versions.',
  },
  [PROCESS_NAMES.ASSET_UPLOAD]: {
    UPLOADING: 'Uploading asset files...',
    FAILED: 'Failed to upload assets.',
  },
  [PROCESS_NAMES.ASSET_PUBLISH]: {
    PUBLISHING: 'Publishing assets...',
    FAILED: 'Failed to publish assets.',
  },
  // Content Types
  [PROCESS_NAMES.CONTENT_TYPES_CREATE]: {
    CREATING: 'Creating content types...',
    FAILED: 'Failed to create content types.',
  },
  [PROCESS_NAMES.CONTENT_TYPES_UPDATE]: {
    UPDATING: 'Updating content types with references...',
    FAILED: 'Failed to update content types.',
  },
  [PROCESS_NAMES.CONTENT_TYPES_REPLACE_EXISTING]: {
    REPLACING: 'Replacing existing content types...',
    FAILED: 'Failed to replace existing content types.',
  },
  // Entries
  [PROCESS_NAMES.CT_PREPARATION]: {
    PREPARING: 'Preparing content types for entry import...',
    FAILED: 'Failed to prepare content types.',
  },
  [PROCESS_NAMES.ENTRIES_CREATE]: {
    CREATING: 'Creating entries...',
    FAILED: 'Failed to create entries.',
  },
  [PROCESS_NAMES.ENTRIES_REPLACE_EXISTING]: {
    REPLACING: 'Replacing existing entries...',
    FAILED: 'Failed to replace existing entries.',
  },
  [PROCESS_NAMES.REFERENCE_UPDATES]: {
    UPDATING: 'Updating entry references...',
    FAILED: 'Failed to update entry references.',
  },
  [PROCESS_NAMES.CT_RESTORATION]: {
    RESTORING: 'Restoring content type references...',
    FAILED: 'Failed to restore content types.',
  },
  [PROCESS_NAMES.FIELD_RULES_UPDATE]: {
    UPDATING: 'Updating field rules...',
    FAILED: 'Failed to update field rules.',
  },
  [PROCESS_NAMES.ENTRIES_PUBLISH]: {
    PUBLISHING: 'Publishing entries...',
    FAILED: 'Failed to publish entries.',
  },
  [PROCESS_NAMES.CLEANUP]: {
    CLEANING: 'Cleaning up auto-created entries...',
    FAILED: 'Failed to clean up temporary data.',
  },
  // Extensions
  [PROCESS_NAMES.EXTENSIONS_CREATE]: {
    CREATING: 'Creating extensions...',
    FAILED: 'Failed to create extensions.',
  },
  [PROCESS_NAMES.EXTENSIONS_REPLACE_EXISTING]: {
    REPLACING: 'Replacing existing extensions...',
    FAILED: 'Failed to replace existing extensions.',
  },
  // Global Fields
  [PROCESS_NAMES.GLOBAL_FIELDS_CREATE]: {
    CREATING: 'Creating global fields...',
    FAILED: 'Failed to create global fields.',
  },
  [PROCESS_NAMES.GLOBAL_FIELDS_UPDATE]: {
    UPDATING: 'Updating global fields...',
    FAILED: 'Failed to update global fields.',
  },
  [PROCESS_NAMES.GLOBAL_FIELDS_REPLACE_EXISTING]: {
    REPLACING: 'Replacing existing global fields...',
    FAILED: 'Failed to replace existing global fields.',
  },
  // Labels
  [PROCESS_NAMES.LABELS_CREATE]: {
    CREATING: 'Creating labels...',
    FAILED: 'Failed to create labels.',
  },
  [PROCESS_NAMES.LABELS_UPDATE]: {
    UPDATING: 'Updating labels...',
    FAILED: 'Failed to update labels.',
  },
  // Locales
  [PROCESS_NAMES.MASTER_LOCALE]: {
    PROCESSING: 'Processing master locale...',
    FAILED: 'Failed to process master locale.',
  },
  [PROCESS_NAMES.LOCALES_CREATE]: {
    CREATING: 'Creating locales...',
    FAILED: 'Failed to create locales.',
  },
  [PROCESS_NAMES.LOCALES_UPDATE]: {
    UPDATING: 'Updating locales...',
    FAILED: 'Failed to update locales.',
  },
  // Marketplace Apps
  [PROCESS_NAMES.SETUP_ENVIRONMENT]: {
    SETTING_UP: 'Setting up marketplace SDK and authentication...',
    FAILED: 'Failed to setup environment.',
  },
  [PROCESS_NAMES.CREATE_APPS]: {
    CREATING: 'Creating private apps...',
    FAILED: 'Failed to create marketplace apps.',
  },
  [PROCESS_NAMES.INSTALL_APPS]: {
    INSTALLING: 'Installing marketplace apps...',
    FAILED: 'Failed to install marketplace apps.',
  },
  // Workflows
  [PROCESS_NAMES.GET_ROLES]: {
    FETCHING: 'Fetching roles for workflow processing...',
    FAILED: 'Failed to fetch workflow roles.',
  },
  [PROCESS_NAMES.WORKFLOWS_CREATE]: {
    IMPORTING: 'Importing workflows...',
    FAILED: 'Failed to create workflows.',
  },

  // Additional import processes
  [PROCESS_NAMES.VARIANT_ENTRIES_IMPORT]: {
    IMPORTING: 'Importing variant entries...',
    FAILED: 'Failed to import variant entries.',
  },
  [PROCESS_NAMES.ENVIRONMENTS_IMPORT]: {
    IMPORTING: 'Importing environments...',
    FAILED: 'Failed to import environments.',
  },
  [PROCESS_NAMES.CUSTOM_ROLES_BUILD_MAPPINGS]: {
    BUILDING: 'Building locale mappings...',
    FAILED: 'Failed to build locale mappings.',
  },
  [PROCESS_NAMES.CUSTOM_ROLES_IMPORT]: {
    IMPORTING: 'Importing custom roles...',
    FAILED: 'Failed to import custom roles.',
  },
  [PROCESS_NAMES.STACK_IMPORT]: {
    IMPORTING: 'Importing stack settings...',
    FAILED: 'Failed to import stack settings.',
  },
  [PROCESS_NAMES.CONTENT_TYPES_GF_UPDATE]: {
    UPDATING: 'Updating global fields with content type references...',
    FAILED: 'Failed to update global fields.',
  },
  [PROCESS_NAMES.CONTENT_TYPES_EXT_UPDATE]: {
    UPDATING: 'Updating extensions...',
    FAILED: 'Failed to update extensions.',
  },
  [PROCESS_NAMES.WEBHOOKS_IMPORT]: {
    IMPORTING: 'Importing webhooks...',
    FAILED: 'Failed to import webhooks.',
  },
  [PROCESS_NAMES.TAXONOMIES_IMPORT]: {
    IMPORTING: 'Importing taxonomies...',
    FAILED: 'Failed to import taxonomies.',
  },
  [PROCESS_NAMES.PERSONALIZE_PROJECTS]: {
    IMPORTING: 'Importing personalization projects...',
    FAILED: 'Failed to import personalization projects.',
  },
};

export type ImportProcessName = (typeof PROCESS_NAMES)[keyof typeof PROCESS_NAMES];
export type ImportModuleContext = (typeof MODULE_CONTEXTS)[keyof typeof MODULE_CONTEXTS];
export type ImportProcessStatus = (typeof PROCESS_STATUS)[keyof typeof PROCESS_STATUS];
