const { fancy } = require('fancy-test');
const { expect } = require('chai');
const { runCommand } = require('@oclif/test')
const inquirer = require('inquirer');
const sinon = require('sinon');
const { cliux, configHandler, managementSDKClient } = require('@contentstack/cli-utilities');
const mockData = require('../mock-data/common.mock.json');
const { getStacks, chooseBranch } = require('../../src/util/index');
const nock = require('nock');
const { cma } = configHandler.get('region');

describe('common utils', () => {
  let managementSdk;
  let sandbox
  beforeEach(async () => {
    managementSdk = await managementSDKClient({
      host: cma.replace('https://', ''),
    });
    sandbox = sinon.createSandbox()
  });
  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  describe('chooseStack', () => {
    describe('choose stack from list of stacks', async () => {
      beforeEach(() => {
        sandbox.stub(inquirer, 'prompt').returns({
          branch: mockData.stacks[0].name,
        });
      });
      it('Returns list of stacks', async () => {
        nock(cma)
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      await getStacks(managementSdk, mockData.organizations[0].uid);
    });
  });

  describe('chooseBranch', () => {
    describe('choose branch from list of branch', () => {
      beforeEach(() => {
        sandbox.stub(inquirer, 'prompt').returns({
          branch: mockData.branch.uid,
        });
      });
      it('Returns list of stacks', async () => {
        const { branch } = await chooseBranch([mockData.branch]);
        expect(branch).to.equal(mockData.branch.uid);
      })
    });
  });
});
