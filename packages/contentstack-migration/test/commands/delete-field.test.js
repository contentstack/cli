'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Delete field test from migration script', () => {
  it('should throw error for non existant field', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-field/delete-invalid-field.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  describe('Positive scenario test', () => {
    before('Create unique id field if not exist', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-field/create-field.js`
      ]);
      match(response, /Success/)
    });

    it('should work as expected', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-field/delete-field.js`
      ]);
      match(response, /Success/);
    });
  });

});
