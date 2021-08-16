'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Transformed entries to type migration script', () => {
  it('should throw error if the parameters passed are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-invalid-params.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error if wrong data type of values are passed', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-invalid-datatype.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error if "environments" is not specified with "shouldPublish"', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-publish-env.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error if source content type is invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-invalid-ct.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "from" fields are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-invalid-from.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "targetContentType" is invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries-to-type/transform-entries-invalid-target-ct.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  //   // it('should do no operation if transformEntryForLocale returns undefined', async () => { });

  it('should return expected result for right values', async () => {
    const response = await execute(null, [
      migration,
      filePathArg,
      `${migrationPath}/transform-entries-to-type/transform-entries`
    ]);
    // console.log('response', response);
    match(response, /Success/);
  });
});