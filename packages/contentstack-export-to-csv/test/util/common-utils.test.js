const { expect } = require('chai');
const inquirer = require('inquirer');
const sinon = require('sinon');
const { configHandler, managementSDKClient } = require('@contentstack/cli-utilities');
const mockData = require('../mock-data/common.mock.json');
const { getStacks, chooseBranch } = require('../../src/util/index');
const nock = require('nock');
const { cma } = configHandler.get('region');

describe('common utils', () => {
  let managementSdk;
  let sandbox;

  beforeEach(async () => {
    managementSdk = await managementSDKClient({
      host: cma.replace('https://', ''),
    });
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  describe('getStacks', () => {
    it('should return a list of stacks for a given organization', async () => {
      sandbox.stub(inquirer, 'prompt').resolves({
        stack: mockData.stacks[0].name,
      });

      nock(cma)
        .get(`/v3/stacks?query={"org_uid":"${mockData.organizations[0].uid}"}`)
        .reply(200, { stacks: mockData.stacks });

      const result = await getStacks(managementSdk, mockData.organizations[0].uid);

      expect(result).to.be.an('object');
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
      });
    });
  });
});
