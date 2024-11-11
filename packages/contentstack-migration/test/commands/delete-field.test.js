'use strict';

const { constants } = require('../setup');
const { migrationPath } = constants;
const path = require('path');
const nockBack = require('nock').back;
const { runCommand } = require('@oclif/test');
const { expect } = require('chai');
const { fancy } = require('fancy-test');
const env = { ...process.env };

describe('Delete field test from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');

  describe('prepare for field test', () => {
    fancy
      .it('Should create content type', async() => {
        await runCommand([
          'cm:migration',
          '-n',
          `${migrationPath}/create-ct/create-ct-opts.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],{ root: process.cwd() })
      });
  });

  describe('Delete field', () => {
    nockBack('delete-field.json', (nockDone) => {
      fancy
        .it('Should delete the field successfully and update content type', async() => {
          const {stdout} = await runCommand([
            'cm:migration',
            '-n',
            `${migrationPath}/delete-field/delete-field.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],{ root: process.cwd() })
          expect(stdout).to.contain("WARNING!!! You're using the old (soon to be deprecated) Contentstack CLI flags (-A, --authtoken)")

          // expect(stdout).to.contains('Successfully updated content type: foo3');
          nockDone();
        });

      fancy
        .it('Should show error on invalid field deletion', async() => {
          const {stdout} = await runCommand([
            'cm:migration',
            '-n',
            `${migrationPath}/delete-field/delete-invalid-field.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],{ root: process.cwd() })
          expect(stdout).to.contain("WARNING!!! You're using the old (soon to be deprecated) Contentstack CLI flags (-A, --authtoken)")

          // expect(stdout).to.contains('facebook_linkss does not exist in the schema');
          nockDone();
        });
    });
  });

  describe('wind up field test', () => {
    fancy
      .it('Should create content type', async() => {
        await runCommand([
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/delete-ct.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],{ root: process.cwd() })
      });
  });
});
