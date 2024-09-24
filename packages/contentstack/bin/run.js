#!/usr/bin/env node
// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  try {
    // Store the original process.emitWarning function
    const originalEmitWarning = process.emitWarning;

    // Override process.emitWarning to filter out the punycode deprecation warning
    process.emitWarning = (warning, type, code, ...args) => {
      // List of libraries for which deprecation warnings should be ignored
      const ignoreWarningLibraries = ['punycode', 'bluebird', 'eslint-plugin-node', 'lodash'];
      const ignoreWarningMessages = [
        'The `util.isArray` API is deprecated. Please use `Array.isArray()` instead.'
      ];
      // Check if the warning belongs to any of the ignored libraries
      const libraryWarning = ignoreWarningLibraries.some(library => 
        type === 'DeprecationWarning' && typeof warning === 'string' && warning.includes(library)
      );
      const specificWarning = ignoreWarningMessages.some(msg =>
        typeof warning === 'string' && warning.includes(msg)
      );
      // If the warning is in the list of libraries to ignore, return early
      if (libraryWarning || specificWarning) {
        return;
      }
      // Call the original emitWarning function for other warnings
      originalEmitWarning.call(process, warning, type, code, ...args);
    };

    const oclif = await import('@oclif/core');
    await oclif.execute({ development: false, dir: __dirname });
  } catch (error) {
    console.error('An error occurred while executing oclif:', error);
  }
})();
