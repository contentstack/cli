'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Derive linked entries migration script', () => {
  it('should throw error if the parameters passed are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/derive-entries/derive-entries-invalid-params.js`
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
        `${migrationPath}/derive-entries/derive-entries-invalid-datatype.js`
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
        `${migrationPath}/derive-entries/derive-entries-publish-env.js`
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
        `${migrationPath}/derive-entries/derive-entries-invalid-ct.js`
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
        `${migrationPath}/derive-entries/derive-entries-invalid-from.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "toReferenceField" is invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/derive-entries/derive-entries-invalid-toref.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "derivedContentType" is invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/derive-entries/derive-entries-invalid-target-ct.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error "derivedFields" are invalid', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/derive-entries/derive-entries-derivedfields.js`
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
      `${migrationPath}/derive-entries/derive-entries`
    ]);
    match(response, /Success/);
  });
});