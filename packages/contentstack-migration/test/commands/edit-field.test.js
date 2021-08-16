'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Edit field test from migration script', () => {
  it('should throw error for non existant field', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/edit-field/edit-invalid-field.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error for misspelled chained methods', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/edit-field/edit-invalid-method.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should work as expected', async () => {
    const response = await execute(null, [
      migration,
      filePathArg,
      `${migrationPath}/edit-field/edit-field.js`
    ]);
    match(response, /Success/);
  });
});
