'use strict';

const { constants } = require('../setup');
const { migrationPath } = constants;
const path = require('path');
const nockBack = require('nock').back;
const { expect, test } = require('@oclif/test');
const env = { ...process.env };

describe('Delete field test from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');

  describe('prepare for field test', () => {
    test
      .command([
        'cm:migration',
        '-n',
        `${migrationPath}/create-ct/create-ct-opts.js`,
        '-A',
        '-k',
        'bltmock9e992a923aafdmock521adc4b5b3',
      ])
      .it('Should create content type', () => {});
  });

  describe('Delete field', () => {
    nockBack('delete-field.json', (nockDone) => {
      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/delete-field/delete-field.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should delete the field successfully and update content type', (ctx) => {
          expect(ctx.stdout).to.contains('Successfully updated content type: foo3');
          nockDone();
        });

      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/delete-field/delete-invalid-field.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('Should show error on invalid field deletion', (ctx) => {
          expect(ctx.stdout).to.contains('facebook_linkss does not exist in the schema');
          nockDone();
        });
    });
  });

  describe('wind up field test', () => {
    test
      .command([
        'cm:migration',
        '-n',
        `${migrationPath}/edit-ct/delete-ct.js`,
        '-A',
        '-k',
        'bltmock9e992a923aafdmock521adc4b5b3',
      ])
      .it('Should create content type', () => {});
  });
});
