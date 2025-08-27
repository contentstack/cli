export const EXPORT_PROCESS_NAMES = {
  // Assets module
  ASSET_FOLDERS: 'Folders',
  ASSET_METADATA: 'Metadata',
  ASSET_DOWNLOADS: 'Downloads',

  // Custom Roles module
  FETCH_ROLES: 'Fetch Roles',
  FETCH_LOCALES: 'Fetch Locales',
  PROCESS_MAPPINGS: 'Process Mappings',

  // Entries module
  ENTRIES: 'Entries',
  ENTRY_VERSIONS: 'Entry Versions',
  VARIANT_ENTRIES: 'Variant Entries',

  // Marketplace Apps module
  FETCH_APPS: 'Fetch Apps',
  FETCH_CONFIG_MANIFEST: 'Fetch config & manifest',

  // Stack module
  STACK_SETTINGS: 'Settings',
  STACK_LOCALE: 'Locale',
  STACK_DETAILS: 'Details',

  // Taxonomies module
  FETCH_TAXONOMIES: 'Fetch Taxonomies',
  EXPORT_TAXONOMIES_TERMS: 'Taxonomies & Terms',

  // Personalize module
  PERSONALIZE_PROJECTS: 'Projects',
  PERSONALIZE_EVENTS: 'Events',
  PERSONALIZE_ATTRIBUTES: 'Attributes',
  PERSONALIZE_AUDIENCES: 'Audiences',
  PERSONALIZE_EXPERIENCES: 'Experiences',
} as const;

export const EXPORT_MODULE_CONTEXTS = {
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
  WEBHOOKS: 'webhooks',
  WORKFLOWS: 'workflows',
} as const;

// Display names for modules to avoid scattering user-facing strings
export const EXPORT_MODULE_NAMES = {
  [EXPORT_MODULE_CONTEXTS.ASSETS]: 'Assets',
  [EXPORT_MODULE_CONTEXTS.CONTENT_TYPES]: 'Content Types',
  [EXPORT_MODULE_CONTEXTS.CUSTOM_ROLES]: 'Custom Roles',
  [EXPORT_MODULE_CONTEXTS.ENTRIES]: 'Entries',
  [EXPORT_MODULE_CONTEXTS.ENVIRONMENTS]: 'Environments',
  [EXPORT_MODULE_CONTEXTS.EXTENSIONS]: 'Extensions',
  [EXPORT_MODULE_CONTEXTS.GLOBAL_FIELDS]: 'Global Fields',
  [EXPORT_MODULE_CONTEXTS.LABELS]: 'Labels',
  [EXPORT_MODULE_CONTEXTS.LOCALES]: 'Locales',
  [EXPORT_MODULE_CONTEXTS.MARKETPLACE_APPS]: 'Marketplace Apps',
  [EXPORT_MODULE_CONTEXTS.PERSONALIZE]: 'Personalize',
  [EXPORT_MODULE_CONTEXTS.STACK]: 'Stack',
  [EXPORT_MODULE_CONTEXTS.TAXONOMIES]: 'Taxonomies',
  [EXPORT_MODULE_CONTEXTS.WEBHOOKS]: 'Webhooks',
  [EXPORT_MODULE_CONTEXTS.WORKFLOWS]: 'Workflows',
} as const;

export const EXPORT_PROCESS_STATUS = {
  [EXPORT_PROCESS_NAMES.ASSET_FOLDERS]: {
    FETCHING: 'Fetching folder structure...',
    FAILED: 'Failed to fetch folder structure.',
  },
  [EXPORT_PROCESS_NAMES.ASSET_METADATA]: {
    FETCHING: 'Fetching asset information...',
    FAILED: 'Failed to fetch asset',
    FETCHING_VERSION: 'Processing versioned assets...',
  },
  [EXPORT_PROCESS_NAMES.ASSET_DOWNLOADS]: {
    DOWNLOADING: 'Downloading asset file...',
    FAILED: 'Failed to download asset:',
  },
  // Custom Roles
  [EXPORT_PROCESS_NAMES.FETCH_ROLES]: {
    FETCHING: 'Fetching custom roles...',
    FAILED: 'Failed to fetch custom roles.',
  },
  [EXPORT_PROCESS_NAMES.FETCH_LOCALES]: {
    FETCHING: 'Fetching locales...',
    FAILED: 'Failed to fetch locales.',
  },
  [EXPORT_PROCESS_NAMES.PROCESS_MAPPINGS]: {
    PROCESSING: 'Processing role-locale mappings...',
    FAILED: 'Failed to process role-locale mappings.',
  },
  [EXPORT_PROCESS_NAMES.ENTRIES]: {
    PROCESSING: 'Processing entry collections...',
    FAILED: 'Failed to export entries.',
  },
  [EXPORT_PROCESS_NAMES.ENTRY_VERSIONS]: {
    PROCESSING: 'Processing entry versions...',
    FAILED: 'Failed to export entry versions.',
  },
  [EXPORT_PROCESS_NAMES.VARIANT_ENTRIES]: {
    PROCESSING: 'Processing variant entries...',
    FAILED: 'Failed to export variant entries.',
  },
  // Marketplace Apps
  [EXPORT_PROCESS_NAMES.FETCH_APPS]: {
    FETCHING: 'Fetching marketplace apps...',
    FAILED: 'Failed to fetch marketplace apps.',
  },
  [EXPORT_PROCESS_NAMES.FETCH_CONFIG_MANIFEST]: {
    PROCESSING: 'Processing app manifests and configurations...',
    FAILED: 'Failed to process app manifests/configurations.',
  },
  // Stack
  [EXPORT_PROCESS_NAMES.STACK_SETTINGS]: {
    EXPORTING: 'Exporting stack settings...',
    FAILED: 'Failed to export stack settings.',
  },
  [EXPORT_PROCESS_NAMES.STACK_LOCALE]: {
    FETCHING: 'Fetching master locale...',
    FAILED: 'Failed to fetch master locale.',
  },
  [EXPORT_PROCESS_NAMES.STACK_DETAILS]: {
    EXPORTING: 'Exporting stack data...',
    FAILED: 'Failed to export stack data.',
  },
  // Taxonomies
  [EXPORT_PROCESS_NAMES.FETCH_TAXONOMIES]: {
    FETCHING: 'Fetching taxonomy metadata...',
    FAILED: 'Failed to fetch taxonomies.',
  },
  [EXPORT_PROCESS_NAMES.EXPORT_TAXONOMIES_TERMS]: {
    EXPORTING: 'Exporting taxonomy details...',
    FAILED: 'Failed to export taxonomy details.',
  },
  // Personalize
  [EXPORT_PROCESS_NAMES.PERSONALIZE_PROJECTS]: {
    EXPORTING: 'Exporting personalization projects...',
    FAILED: 'Failed to export personalization projects.',
  },
  [EXPORT_PROCESS_NAMES.PERSONALIZE_EVENTS]: {
    EXPORTING: 'Exporting events...',
    FAILED: 'Failed to export events.',
  },
  [EXPORT_PROCESS_NAMES.PERSONALIZE_ATTRIBUTES]: {
    EXPORTING: 'Exporting attributes...',
    FAILED: 'Failed to export attributes.',
  },
  [EXPORT_PROCESS_NAMES.PERSONALIZE_AUDIENCES]: {
    EXPORTING: 'Exporting audiences...',
    FAILED: 'Failed to export audiences.',
  },
  [EXPORT_PROCESS_NAMES.PERSONALIZE_EXPERIENCES]: {
    EXPORTING: 'Exporting experiences...',
    FAILED: 'Failed to export experiences.',
  },
};

export type ExportProcessName = (typeof EXPORT_PROCESS_NAMES)[keyof typeof EXPORT_PROCESS_NAMES];
export type ExportModuleContext = (typeof EXPORT_MODULE_CONTEXTS)[keyof typeof EXPORT_MODULE_CONTEXTS];
export type ExportProcessStatus = (typeof EXPORT_PROCESS_STATUS)[keyof typeof EXPORT_PROCESS_STATUS];
