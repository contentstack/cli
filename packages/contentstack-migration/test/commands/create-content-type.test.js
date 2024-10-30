'use strict';

const { constants } = require('../setup');
const path = require('path');
const { migrationPath } = constants;
const nockBack = require('nock').back;
const { runCommand } = require('@oclif/test');
const { expect } = require('chai');
const { fancy } = require('fancy-test');

describe('Create content type from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__');
  nockBack.setMode('record');
  describe('Create content type with passing options as arguments', () => {
    nockBack('create-content-type.json', (nockDone) => {
      fancy.it('Should create content type', async () => {
        const { stdout } = await runCommand(
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
        expect(stdout).to.contain('Successfully added content type: foo3');
        nockDone();
      });

      fancy.it('Should update content type', async () => {
        const { stdout } = await runCommand(
          [
            'cm:migration',
            '-n',
            `${migrationPath}/edit-ct/edit-ct.success.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],
          { root: process.cwd() },
        );
        expect(stdout).to.contain('Successfully updated content type: foo3\n');
        nockDone();
      });

      fancy.it('Should delete content type', async () => {
        const { stdout } = await runCommand(
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
        expect(stdout).to.contain('Successfully executed task: Deleting content type\n');
        nockDone();
      });
    });
  });

  describe('should show error for misspelled properties', () => {
    fancy.it('Should show error message for invalid prop set', async () => {
      const { stdout } = await runCommand(
        [
          'cm:migration',
          '-n',
          `${migrationPath}/create-ct/create-ct-misspelled-props.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],
        { root: process.cwd() },
      );
      expect(stdout).to.contains('description is missing.');
    });

    fancy.it('Should show error message for invalid function call', async () => {
      const { stdout } = await runCommand(
        [
          'cm:migration',
          '-n',
          `${migrationPath}/create-ct/create-ct-misspelled.js`,
          '-A',
          '-k',
          'bltmock9e992a923aafdmock521adc4b5b3',
        ],
        { root: process.cwd() },
      );
      expect(stdout).to.contains('data_tyep is not a valid function');
    });

    nockBack('missing-required-field.json', (nockDone) => {
      fancy.it('Should show error message for invalid function call', async () => {
        const { stdout } = await runCommand(
          [
            'cm:migration',
            '-n',
            `${migrationPath}/edit-field/missing-required-fields.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],
          { root: process.cwd() },
        );
        expect(stdout).to.contains("should have a 'title' field.\"");
        nockDone();
      });
    });
  });
});
