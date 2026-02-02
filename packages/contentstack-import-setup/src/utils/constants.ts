export const PROCESS_NAMES = {
  // Entries module
  ENTRIES_MAPPER_GENERATION: 'Mapper Generation',

  // Content Types module
  CONTENT_TYPES_MAPPER_GENERATION: 'Mapper Generation',
  CONTENT_TYPES_DEPENDENCY_SETUP: 'Dependency Setup',

  // Global Fields module
  GLOBAL_FIELDS_MAPPER_GENERATION: 'Mapper Generation',
  GLOBAL_FIELDS_DEPENDENCY_SETUP: 'Dependency Setup',

  // Extensions module
  EXTENSIONS_MAPPER_GENERATION: 'Mapper Generation',

  // Assets module
  ASSETS_MAPPER_GENERATION: 'Mapper Generation',
  ASSETS_FETCH_AND_MAP: 'Fetch and Map',

  // Custom Roles module
  CUSTOM_ROLES_MAPPER_GENERATION: 'Mapper Generation',

  // Marketplace Apps module
  MARKETPLACE_APPS_MAPPER_GENERATION: 'Mapper Generation',
  MARKETPLACE_APPS_FETCH: 'Fetch Apps',

  // Taxonomies module
  TAXONOMIES_MAPPER_GENERATION: 'Mapper Generation',
  TAXONOMIES_FETCH: 'Fetch Taxonomies',
  TAXONOMIES_TERMS_FETCH: 'Fetch Terms',
} as const;

export const MODULE_CONTEXTS = {
  ENTRIES: 'entries',
  CONTENT_TYPES: 'content-types',
  GLOBAL_FIELDS: 'global-fields',
  EXTENSIONS: 'extensions',
  ASSETS: 'assets',
  CUSTOM_ROLES: 'custom-roles',
  MARKETPLACE_APPS: 'marketplace-apps',
  TAXONOMIES: 'taxonomies',
} as const;

// Display names for modules to avoid scattering user-facing strings
export const MODULE_NAMES = {
  [MODULE_CONTEXTS.ENTRIES]: 'Entries',
  [MODULE_CONTEXTS.CONTENT_TYPES]: 'Content Types',
  [MODULE_CONTEXTS.GLOBAL_FIELDS]: 'Global Fields',
  [MODULE_CONTEXTS.EXTENSIONS]: 'Extensions',
  [MODULE_CONTEXTS.ASSETS]: 'Assets',
  [MODULE_CONTEXTS.CUSTOM_ROLES]: 'Custom Roles',
  [MODULE_CONTEXTS.MARKETPLACE_APPS]: 'Marketplace Apps',
  [MODULE_CONTEXTS.TAXONOMIES]: 'Taxonomies',
} as const;

export const PROCESS_STATUS: Record<keyof typeof PROCESS_NAMES, Record<string, string>> = {
  // Entries
  ENTRIES_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },

  // Content Types
  CONTENT_TYPES_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },
  CONTENT_TYPES_DEPENDENCY_SETUP: {
    SETTING_UP: 'Setting up dependencies...',
    FAILED: 'Failed to setup dependencies.',
  },

  // Global Fields
  GLOBAL_FIELDS_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },
  GLOBAL_FIELDS_DEPENDENCY_SETUP: {
    SETTING_UP: 'Setting up dependencies...',
    FAILED: 'Failed to setup dependencies.',
  },

  // Extensions
  EXTENSIONS_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },

  // Assets
  ASSETS_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },
  ASSETS_FETCH_AND_MAP: {
    FETCHING: 'Fetching and mapping assets...',
    FAILED: 'Failed to fetch and map assets.',
  },

  // Custom Roles
  CUSTOM_ROLES_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },

  // Marketplace Apps
  MARKETPLACE_APPS_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },
  MARKETPLACE_APPS_FETCH: {
    FETCHING: 'Fetching marketplace apps...',
    FAILED: 'Failed to fetch marketplace apps.',
  },

  // Taxonomies
  TAXONOMIES_MAPPER_GENERATION: {
    GENERATING: 'Generating mapper files...',
    FAILED: 'Failed to generate mapper files.',
  },
  TAXONOMIES_FETCH: {
    FETCHING: 'Fetching taxonomies...',
    FAILED: 'Failed to fetch taxonomies.',
  },
  TAXONOMIES_TERMS_FETCH: {
    FETCHING: 'Fetching terms...',
    FAILED: 'Failed to fetch terms.',
  },
} as const;

export type ImportSetupProcessName = (typeof PROCESS_NAMES)[keyof typeof PROCESS_NAMES];
export type ImportSetupModuleContext = (typeof MODULE_CONTEXTS)[keyof typeof MODULE_CONTEXTS];

