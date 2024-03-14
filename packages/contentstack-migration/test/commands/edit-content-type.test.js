'use strict';

const { constants } = require('../setup');
const { migrationPath } = constants;
const path = require('path');
const nockBack = require('nock').back;
const { expect, test } = require('@oclif/test');

describe('Edit content type from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');
  describe('prepare for edit field test', () => {
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

  describe('Allow editing existing content type', () => {
    nockBack('edit-content-type.json', (nockDone) => {
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
        .it('should allow editing a existing content type', (ctx) => {
          expect(ctx.stdout).to.contains('Successfully updated content type: foo3');
          nockDone();
        });

      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/edit-ct.failure.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('should throw an error editing non existent content type', (ctx) => {
          expect(ctx.stdout).to.contains("The Content Type 'foo100' was not found. Please try again.");
          nockDone();
        });

      // test
      // .stdout()
      // .command(['cm:migration', '-n', `${migrationPath}/edit-ct/edit-ct-misspelled-props.js`, '-A', '-k', 'bltmock9e992a923aafdmock521adc4b5b3'])
      // .it('should throw error for misspelled properties while passing options', ctx => {
      //   expect(ctx.stdout).to.contains('The Content Type \'foo100\' was not found. Please try again.')
      //   nockDone()
      // })

      test
        .stdout()
        .command([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/edit-ct-misspelled-method.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ])
        .it('should throw error for misspelled chaining methods', (ctx) => {
          expect(ctx.stdout).to.contains('deschripshion is not a valid function');
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
      .it('Should delete content type', () => {});
  });
});
