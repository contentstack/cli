#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const Module = require('module');

// In this monorepo, pnpm can place a second physical copy of @contentstack/cli-utilities
// (older chalk cache) while plugins resolve the main package's symlinked copy. Force all
// requires to the same package root so loadChalk/getChalk share one implementation.
const utilitiesPkgJson = path.resolve(__dirname, '..', 'node_modules', '@contentstack', 'cli-utilities', 'package.json');
if (fs.existsSync(utilitiesPkgJson)) {
  const resolveFromUtilities = Module.createRequire(utilitiesPkgJson);
  const origResolveFilename = Module._resolveFilename.bind(Module);
  Module._resolveFilename = (request, parent, isMain, options) => {
    if (request === '@contentstack/cli-utilities' || request.startsWith('@contentstack/cli-utilities/')) {
      try {
        const relative =
          request === '@contentstack/cli-utilities' ? '.' : `.${request.slice('@contentstack/cli-utilities'.length)}`;
        return resolveFromUtilities.resolve(relative);
      } catch {
        /* fall through */
      }
    }
    return origResolveFilename(request, parent, isMain, options);
  };
}

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
