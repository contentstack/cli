const { fancy } = require('fancy-test');
const { test, expect } = require('@oclif/test');
const inquirer = require('inquirer');
const { cliux, configHandler, ContentstackClient, managementSDKClient } = require('@contentstack/cli-utilities');

const mockData = require('../mock-data/common.mock.json');
const { getStacks, chooseBranch } = require('../../src/util/index');

const { cma } = configHandler.get('region');

describe('common utils', () => {
  let managementSdk;
  before(async () => {
    managementSdk = await managementSDKClient({
      host: cma.replace('https://', ''),
    });
  });

  describe('chooseStack', () => {
    describe('choose stack from list of stacks', () => {
      fancy
        .nock(cma, (api) =>
          api
            .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
            .reply(200, { stacks: mockData.stacks }),
        )
        .stub(inquirer, 'prompt', () => {
          return Promise.resolve({
            chosenStack: mockData.stacks[0].name,
          });
        })
        .it('Returns list of stacks', async () => {
          await getStacks(managementSdk, mockData.organizations[0].uid);
        });
    });
  });

  describe('chooseBranch', () => {
    describe('choose branch from list of branch', () => {
      fancy
        .stub(inquirer, 'prompt', () => {
          return Promise.resolve({
            branch: mockData.branch.uid,
          });
        })
        .it('Returns list of stacks', async () => {
          const { branch } = await chooseBranch([mockData.branch]);
          expect(branch).to.equal(mockData.branch.uid);
        });
    });
  });
});
