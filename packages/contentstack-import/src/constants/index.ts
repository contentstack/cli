export const PATH_CONSTANTS = {
  /** Root mapper directory (contains module-specific mapper subdirs) */
  MAPPER: 'mapper',

  /** Common mapper file names */
  FILES: {
    SUCCESS: 'success.json',
    FAILS: 'fails.json',
    UID_MAPPING: 'uid-mapping.json',
    URL_MAPPING: 'url-mapping.json',
    UID_MAPPER: 'uid-mapper.json',
    SCHEMA: 'schema.json',
    SETTINGS: 'settings.json',
    MODIFIED_SCHEMAS: 'modified-schemas.json',
    UNIQUE_MAPPING: 'unique-mapping.json',
    TAXONOMIES: 'taxonomies.json',
    ENVIRONMENTS: 'environments.json',
    PENDING_EXTENSIONS: 'pending_extensions.js',
    PENDING_GLOBAL_FIELDS: 'pending_global_fields.js',
    INDEX: 'index.json',
    FOLDER_MAPPING: 'folder-mapping.json',
    VERSIONED_ASSETS: 'versioned-assets.json',
  },

  /** Module subdirectory names within mapper */
  MAPPER_MODULES: {
    ASSETS: 'assets',
    ENTRIES: 'entries',
    CONTENT_TYPES: 'content_types',
    TAXONOMIES: 'taxonomies',
    TAXONOMY_TERMS: 'terms',
    GLOBAL_FIELDS: 'global_fields',
    EXTENSIONS: 'extensions',
    WORKFLOWS: 'workflows',
    WEBHOOKS: 'webhooks',
    LABELS: 'labels',
    ENVIRONMENTS: 'environments',
    MARKETPLACE_APPS: 'marketplace_apps',
    CUSTOM_ROLES: 'custom-roles',
    LANGUAGES: 'languages',
  },

  /** Content directory names (used in both import and export) */
  CONTENT_DIRS: {
    ASSETS: 'assets',
    ENTRIES: 'entries',
    CONTENT_TYPES: 'content_types',
    TAXONOMIES: 'taxonomies',
    GLOBAL_FIELDS: 'global_fields',
    EXTENSIONS: 'extensions',
    WEBHOOKS: 'webhooks',
    WORKFLOWS: 'workflows',
    LABELS: 'labels',
    ENVIRONMENTS: 'environments',
    STACK: 'stack',
    LOCALES: 'locales',
    MARKETPLACE_APPS: 'marketplace_apps',
  },
} as const;

export type PathConstants = typeof PATH_CONSTANTS;
