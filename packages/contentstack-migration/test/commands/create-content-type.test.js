'use strict';

const { constants } = require('../setup');
const path = require('path');
const { migrationPath } = constants;
const nockBack = require('nock').back;
const { expect, test } = require('@oclif/test');

describe('Create content type from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');
  describe('Create content type with passing options as arguments', () => {
    nockBack('create-content-type.json', (nockDone) => {
      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/create-ct/create-ct-opts.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should create content type', (ctx) => {
          expect(ctx.stdout).to.contain('Successfully added content type: foo3');
          nockDone();
        });

      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/edit-ct.success.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should update content type', (ctx) => {
          expect(ctx.stdout).to.contain('Successfully updated content type: foo3\n');
          nockDone();
        });

      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/delete-ct.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should delete content type', (ctx) => {
          expect(ctx.stdout).to.contain('Successfully executed task: Deleting content type\n');
          nockDone();
        });
    });
  });

  describe('should show error for misspelled properties', () => {
    test
      .stdout()
      .command([
        'cm:migration',
        '-n',
        `${migrationPath}/create-ct/create-ct-misspelled-props.js`,
        '-A',
        '-k',
        'bltmock9e992a923aafdmock521adc4b5b3',
      ])
      .it('Should show error message for invalid prop set', async (ctx) => {
        expect(ctx.stdout).to.contains('description is missing.');
      });

    test
      .stdout()
      .command([
        'cm:migration',
        '-n',
        `${migrationPath}/create-ct/create-ct-misspelled.js`,
        '-A',
        '-k',
        'bltmock9e992a923aafdmock521adc4b5b3',
      ])
      .it('Should show error message for invalid function call', async (ctx) => {
        expect(ctx.stdout).to.contains('data_tyep is not a valid function');
      });

    nockBack('missing-required-field.json', (nockDone) => {
      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-field/missing-required-fields.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should show error message for invalid function call', async (ctx) => {
          expect(ctx.stdout).to.contains("should have a 'title' field.\"");
          nockDone();
        });
    });
  });
});
