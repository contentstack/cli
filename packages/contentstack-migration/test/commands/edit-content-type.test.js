'use strict';

const { constants } = require('../setup');
const { migrationPath } = constants;
const path = require('path');
const nockBack = require('nock').back;
const { runCommand } = require('@oclif/test');
const { expect } = require('chai');
const { fancy } = require('fancy-test');

describe('Edit content type from migration script', () => {
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

  describe('Allow editing existing content type', () => {
    nockBack('edit-content-type.json', (nockDone) => {
      fancy.it('should allow editing a existing content type', async () => {
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
        expect(stdout).to.contains('Successfully updated content type: foo3');
        nockDone();
      });

      fancy
        .it('should throw an error editing non existent content type', async () => {
          const { stdout } = await runCommand([
            'cm:migration',
            '-n',
            `${migrationPath}/edit-ct/edit-ct.failure.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ]);
          expect(stdout).to.contains("The Content Type 'foo100' was not found. Please try again.");
          nockDone();
        });

      // test
      // .stdout()
      // .command(['cm:migration', '-n', `${migrationPath}/edit-ct/edit-ct-misspelled-props.js`, '-A', '-k', 'bltmock9e992a923aafdmock521adc4b5b3'])
      // .it('should throw error for misspelled properties while passing options', ctx => {
      //   expect(ctx.stdout).to.contains('The Content Type \'foo100\' was not found. Please try again.')
      //   nockDone()
      // })

      fancy.it('should throw error for misspelled chaining methods', async () => {
        const { stdout } = await runCommand(
          [
            'cm:migration',
            '-n',
            `${migrationPath}/edit-ct/edit-ct-misspelled-method.js`,
            '-A',
            '-k',
            'bltmock9e992a923aafdmock521adc4b5b3',
          ],
          { root: process.cwd() },
        );
        expect(stdout).to.contains('deschripshion is not a valid function');
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
