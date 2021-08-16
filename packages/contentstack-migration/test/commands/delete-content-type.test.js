'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg,migrationPath } = constants;

describe('Delete content type from migration script', () => {
  // describe('Delete content type', () => {
  before('Create content type using migration script', async () => {
    const response = await execute(null, [
      migration,
      filePathArg,
      `${migrationPath}/create-ct/create-ct-opts.js`
    ]);
    match(response, /Successfully saved Content type/);
  });

  it('should delete created content type', async () => {
    const response = await execute(null, [
      migration,
      filePathArg,
      `${migrationPath}/delete-ct.js`
    ]);
    match(response, /Successfully deleted Content type/);
  });
  // });
});