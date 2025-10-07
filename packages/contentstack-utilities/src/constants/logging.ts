export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  success: 2, // Maps to info level but with different type
  debug: 3,
  verbose: 4,
} as const;

// 2. Create color mappings (for console only)
export const levelColors = {
  error: 'red',
  warn: 'yellow',
  success: 'green', // Custom color for success
  info: 'white',
  debug: 'blue',
};

export const PROGRESS_SUPPORTED_MODULES = ['export', 'import'] as const;
