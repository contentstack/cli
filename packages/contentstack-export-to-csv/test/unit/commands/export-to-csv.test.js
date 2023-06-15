/* eslint-disable no-undef */
const { describe, it, beforeEach, afterEach } = require('mocha');
const ExportToCsvCommand = require('../../../src/commands/cm/export-to-csv');
const { stub, assert } = require('sinon');
const { config } = require('dotenv');
const inquirer = require('inquirer');
const { cliux } = require('@contentstack/cli-utilities');

config();

describe('Export to csv command with action = entries', () => {
  let inquireStub;
  let errorStub;
  let consoleLogStub;

  beforeEach(() => {
    inquireStub = stub(inquirer, 'prompt');
    errorStub = stub(cliux, 'error');
    consoleLogStub = stub(cliux, 'print');
  });

  afterEach(() => {
    inquireStub.restore();
    errorStub.restore();
    consoleLogStub.restore();
  });

  it('Should ask for action when action is not passed (entries or users)', async () => {
    await ExportToCsvCommand.run([]);
    assert.calledOnce(inquireStub);
  });

  it('Should ask for org when org is not passed', async () => {
    const args = ['--action', 'entries'];
    await ExportToCsvCommand.run(args);
    assert.calledOnce(inquireStub);
  });

  it('Should ask for stack when stack api key flag is not passed', async (done) => {
    const args = ['--action', 'entries', '--org', process.env.ORG];
    done();
    await ExportToCsvCommand.run(args);
    assert.calledOnce(inquireStub);
  });

  it('Should ask for branch when branch flag is not passed', async () => {
    const args = ['--action', 'entries', '--org', process.env.ORG, '--stack-api-key', process.env.STACK];
    await ExportToCsvCommand.run(args);
    assert.calledTwice(inquireStub);
  });

  it('Should throw an error if stack does not have branches enabled', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG_WITH_NO_BRANCHES,
      '--stack-api-key',
      process.env.STACK_WITH_ORG_WITH_NO_BRANCHES,
      '--branch',
      'invalid',
    ];
    await ExportToCsvCommand.run(args);
    assert.calledWith(
      errorStub,
      'Branches are not part of your plan. Please contact support@contentstack.com to upgrade your plan.',
    );
  });

  it('Should ask for content type when content type flag is not passed', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG,
      '--stack-api-key',
      process.env.STACK,
      '--branch',
      process.env.BRANCH,
    ];
    await ExportToCsvCommand.run(args);
    assert.calledOnce(inquireStub);
  });

  it('Should create a file starting with the name passed as stack-name flag', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG,
      '--stack-api-key',
      process.env.STACK,
      '--branch',
      process.env.BRANCH,
      '--content-type',
      'page',
      '--locale',
      'en-us',
      '--stack-name',
      'okok',
    ];
    await ExportToCsvCommand.run(args);
    assert.calledWith(consoleLogStub, `Writing entries to file: ${process.cwd()}/okok_page_en-us_entries_export.csv`);
  });

  it('Should throw an error when invalid org is passed', async () => {
    const args = ['--action', 'entries', '--org', 'invalid'];
    await ExportToCsvCommand.run(args);
    assert.calledWith(errorStub, `Couldn't find the organization. Please check input parameters.`);
  });

  it('Should throw an error when invalid stack is passed', async () => {
    const args = ['--action', 'entries', '--org', process.env.ORG, '--stack-api-key', 'invalid'];
    await ExportToCsvCommand.run(args);
    assert.calledWith(errorStub, 'Could not find stack');
  });

  it('Should throw an error when invalid branch is passed', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG,
      '--stack-api-key',
      process.env.STACK,
      '--branch',
      process.env.INVALID_BRANCH,
    ];
    await ExportToCsvCommand.run(args);
    assert.calledWith(errorStub, 'Failed to fetch Branch. Please try again with valid parameters.');
  });

  it('Should throw an error when invalid contenttype is passed', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG,
      '--stack-api-key',
      process.env.STACK,
      '--branch',
      process.env.BRANCH,
      '--content-type',
      'invalid',
      '--locale',
      'en-us',
    ];
    await ExportToCsvCommand.run(args);
    assert.calledWith(
      errorStub,
      `The Content Type invalid was not found. Please try again. Content Type is not valid.`,
    );
  });

  it('Should throw an error when invalid locale is passed', async () => {
    const args = [
      '--action',
      'entries',
      '--org',
      process.env.ORG,
      '--stack-api-key',
      process.env.STACK,
      '--branch',
      process.env.BRANCH,
      '--content-type',
      'header',
      '--locale',
      'invalid',
    ];
    await ExportToCsvCommand.run(args);
    assert.calledWith(errorStub, 'Language was not found. Please try again.');
  });
});

describe('Export to csv command with action = users', () => {
  let inquireStub;
  let errorStub;
  let consoleLogStub;

  beforeEach(() => {
    inquireStub = stub(inquirer, 'prompt');
    errorStub = stub(cliux, 'error');
    consoleLogStub = stub(cliux, 'print');
  });

  afterEach(() => {
    inquireStub.restore();
    errorStub.restore();
    consoleLogStub.restore();
  });

  it('Should ask for org when org is not passed', async () => {
    const args = ['--action', 'entries'];
    await ExportToCsvCommand.run(args);
    assert.calledOnce(inquireStub);
  });

  it('Should write users data to file if the user has permissions', async () => {
    const args = ['--action', 'users', '--org', process.env.ORG];

    await ExportToCsvCommand.run(args);
    assert.calledWith(
      consoleLogStub,
      `Writing organization details to file: ${process.cwd()}/${process.env.ORG}_users_export.csv`,
    );
  });

  it('Should show an error that user does not have org permissions to perform the operation if user enters such org', async () => {
    const args = ['--action', 'users', '--org', process.env.ORG_WITH_NO_PERMISSION];
    await ExportToCsvCommand.run(args);
    assert.calledWith(errorStub, `You don't have the permission to do this operation.`);
  });

  it('Should create a file starting with the name passed as org-name flag', async () => {
    const args = ['--action', 'users', '--org', process.env.ORG, '--org-name', 'okok'];
    await ExportToCsvCommand.run(args);
    assert.calledWith(consoleLogStub, `Writing organization details to file: ${process.cwd()}/okok_users_export.csv`);
  });
});
