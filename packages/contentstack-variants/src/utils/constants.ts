export const PROCESS_NAMES = {
  PROJECTS: 'Projects',
  ATTRIBUTES: 'Attributes', 
  AUDIENCES: 'Audiences',
  EVENTS: 'Events',
  EXPERIENCES: 'Experiences',
  VARIANT_ENTRIES: 'Variant Entries',
} as const;

export const MODULE_DISPLAY_MAPPER = {
  events: PROCESS_NAMES.EVENTS,
  attributes: PROCESS_NAMES.ATTRIBUTES,
  audiences: PROCESS_NAMES.AUDIENCES,
  experiences: PROCESS_NAMES.EXPERIENCES,
  projects: PROCESS_NAMES.PROJECTS,
  'variant-entries': PROCESS_NAMES.VARIANT_ENTRIES,
} as const;

export const MODULE_CONTEXTS = {
  PROJECTS: 'projects',
  ATTRIBUTES: 'attributes',
  AUDIENCES: 'audiences', 
  EVENTS: 'events',
  EXPERIENCES: 'experiences',
  VARIANT_ENTRIES: 'variant-entries',
} as const;

// Export process status messages
export const EXPORT_PROCESS_STATUS = {
  [PROCESS_NAMES.PROJECTS]: {
    FETCHING: 'Fetching projects...',
    EXPORTING: 'Exporting projects...',
    FAILED: 'Failed to export projects.',
  },
  [PROCESS_NAMES.ATTRIBUTES]: {
    FETCHING: 'Fetching attributes...',
    EXPORTING: 'Exporting attributes...',
    FAILED: 'Failed to export attributes.',
  },
  [PROCESS_NAMES.AUDIENCES]: {
    FETCHING: 'Fetching audiences...',
    EXPORTING: 'Exporting audiences...',
    FAILED: 'Failed to export audiences.',
  },
  [PROCESS_NAMES.EVENTS]: {
    FETCHING: 'Fetching events...',
    EXPORTING: 'Exporting events...',
    FAILED: 'Failed to export events.',
  },
  [PROCESS_NAMES.EXPERIENCES]: {
    FETCHING: 'Fetching experiences...',
    EXPORTING: 'Exporting experiences...',
    FAILED: 'Failed to export experiences.',
  },
  [PROCESS_NAMES.VARIANT_ENTRIES]: {
    PROCESSING: 'Processing variant entries...',
    EXPORTING: 'Exporting variant entries...',
    FAILED: 'Failed to export variant entries.',
  },
} as const;

// Import process status messages
export const IMPORT_PROCESS_STATUS = {
  [PROCESS_NAMES.PROJECTS]: {
    CREATING: 'Creating projects...',
    IMPORTING: 'Importing projects...',
    FAILED: 'Failed to import projects.',
  },
  [PROCESS_NAMES.ATTRIBUTES]: {
    CREATING: 'Creating attributes...',
    IMPORTING: 'Importing attributes...',
    FAILED: 'Failed to import attributes.',
  },
  [PROCESS_NAMES.AUDIENCES]: {
    CREATING: 'Creating audiences...',
    IMPORTING: 'Importing audiences...',
    FAILED: 'Failed to import audiences.',
  },
  [PROCESS_NAMES.EVENTS]: {
    CREATING: 'Creating events...',
    IMPORTING: 'Importing events...',
    FAILED: 'Failed to import events.',
  },
  [PROCESS_NAMES.EXPERIENCES]: {
    CREATING: 'Creating experiences...',
    IMPORTING: 'Importing experiences...',
    FAILED: 'Failed to import experiences.',
  },
  [PROCESS_NAMES.VARIANT_ENTRIES]: {
    PROCESSING: 'Processing variant entries...',
    IMPORTING: 'Importing variant entries...',
    FAILED: 'Failed to import variant entries.',
  },
} as const;

export type ProcessName = typeof PROCESS_NAMES[keyof typeof PROCESS_NAMES];
export type ModuleKey = keyof typeof MODULE_DISPLAY_MAPPER;
export type ModuleContext = typeof MODULE_CONTEXTS[keyof typeof MODULE_CONTEXTS]; 