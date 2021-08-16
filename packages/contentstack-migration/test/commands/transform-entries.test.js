'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Transform entries migration script', () => {

  // before('Create content type for test', async () => {
  //   const response = await execute(null, [
  //     migration,
  //     filePathArg,
  //     `${migrationPath}/create-ct.js`
  //   ]);
  //   match(response, /Success/);
  // });

  // after('Delete content type after test', async () => {
  //   const response = await execute(null, [
  //     migration,
  //     filePathArg,
  //     `${migrationPath}/delete-ct.js`
  //   ]);
  //   match(response, /Success/);
  // });

  it('should throw error if the parameters passed are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries/transform-entries-invalid-params.js`
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
        `${migrationPath}/transform-entries/transform-entries-invalid-datatype.js`
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
        `${migrationPath}/transform-entries/transform-entries-publish-env.js`
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
        `${migrationPath}/transform-entries/transform-entries-invalid-ct.js`
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
        `${migrationPath}/transform-entries/transform-entries-invalid-from.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "to" fields are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/transform-entries/transform-entries-invalid-to.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  // it('should do no operation if transformEntryForLocale returns undefined', async () => { });

  it('should return expected result for right values', async () => {
    const response = await execute(null, [
      migration,
      filePathArg,
      `${migrationPath}/transform-entries/transform-entries`
    ]);
    match(response, /successfully completed/);
  });
});