/**
 * Constants for clone operations
 */

/**
 * List of structure modules (excluding entries and assets)
 */
export const STRUCTURE_LIST: string[] = [
  'locales',
  'environments',
  'extensions',
  'marketplace-apps',
  'webhooks',
  'global-fields',
  'content-types',
  'workflows',
  'labels',
];

/**
 * Stack creation confirmation prompt configuration
 */
export const STACK_CREATION_CONFIRMATION = [
  {
    type: 'confirm',
    name: 'stackCreate',
    message: 'Want to clone content into a new stack ?',
    initial: true,
  },
] as const;

/**
 * Stack name prompt configuration
 */
export const STACK_NAME_PROMPT = {
  type: 'input',
  name: 'stack',
  default: 'ABC',
  message: 'Enter name for the new stack to store the cloned content ?',
} as const;
