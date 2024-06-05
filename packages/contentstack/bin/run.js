#!/usr/bin/env node
// eslint-disable-next-line unicorn/prefer-top-level-await
(async () => {
  try {
    // Store the original process.emitWarning function
    const originalEmitWarning = process.emitWarning;

    // Override process.emitWarning to filter out the punycode deprecation warning
    process.emitWarning = (warning, type, code, ...args) => {
      if (type === 'DeprecationWarning' && typeof warning === 'string' && warning.includes('punycode')) {
        // Ignore punycode deprecation warning
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
