'use strict';

const { constants } = require('../setup');
const { migrationPath } = constants;
const path = require('path');
const nockBack = require('nock').back;
const { runCommand } = require('@oclif/test');
const { expect } = require('chai');
const { fancy } = require('fancy-test');

describe('Move field test from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');
  describe('prepare for edit field test', () => {
    fancy.it('Should create content type', async () => {
      await runCommand(
        [
          'cm:migration',
          '-n',
          `${migrationPath}/create-ct/create-ct-opts.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],
        { root: process.cwd() },
      );
    });
  });
  describe('Move field', () => {
    nockBack('move-field.json', (nockDone) => {
      fancy.it('Should move the field successfully for content type', async () => {
        const { stdout } = await runCommand(
          [
            'cm:migration',
            '-n',
            `${migrationPath}/move-field/move-field.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],
          { root: process.cwd() },
        );
        expect(stdout).to.contains('Successfully updated content type: foo3');
        nockDone();
      });

      fancy.it('Should show error message on invalid method call', async () => {
        const { stdout } = await runCommand(
          [
            'cm:migration',
            '-n',
            `${migrationPath}/move-field/move-invalid-method.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],
          { root: process.cwd() },
        );
        expect(stdout).to.contains('toTheBotto is not a valid function');
        nockDone();
      });
    });
  });
  describe('wind up field test', () => {
    fancy.it('Should delete content type', async () => {
      await runCommand(
        [
          'cm:migration',
          '-n',
          `${migrationPath}/edit-ct/delete-ct.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],
        { root: process.cwd() },
      );
    });
  });
});
