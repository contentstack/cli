/**
 * Main process name for Asset Management 2.0 export (single progress bar).
 * Use this when adding/starting the process and for all ticks.
 */
export const AM_MAIN_PROCESS_NAME = 'Asset Management 2.0';

/**
 * Process names for Asset Management 2.0 export progress (for tick labels).
 */
export const PROCESS_NAMES = {
  AM_SPACE_METADATA: 'Space metadata',
  AM_FOLDERS: 'Folders',
  AM_ASSETS: 'Assets',
  AM_FIELDS: 'Fields',
  AM_ASSET_TYPES: 'Asset types',
  AM_DOWNLOADS: 'Asset downloads',
} as const;

/**
 * Status messages for each process (exporting, fetching, failed).
 */
export const PROCESS_STATUS = {
  [PROCESS_NAMES.AM_SPACE_METADATA]: {
    EXPORTING: 'Exporting space metadata...',
    FAILED: 'Failed to export space metadata.',
  },
  [PROCESS_NAMES.AM_FOLDERS]: {
    FETCHING: 'Fetching folders...',
    FAILED: 'Failed to fetch folders.',
  },
  [PROCESS_NAMES.AM_ASSETS]: {
    FETCHING: 'Fetching assets...',
    FAILED: 'Failed to fetch assets.',
  },
  [PROCESS_NAMES.AM_FIELDS]: {
    FETCHING: 'Fetching fields...',
    FAILED: 'Failed to fetch fields.',
  },
  [PROCESS_NAMES.AM_ASSET_TYPES]: {
    FETCHING: 'Fetching asset types...',
    FAILED: 'Failed to fetch asset types.',
  },
  [PROCESS_NAMES.AM_DOWNLOADS]: {
    DOWNLOADING: 'Downloading asset files...',
    FAILED: 'Failed to download assets.',
  },
} as const;
