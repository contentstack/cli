const { expect } = require('chai');
const inquirer = require('inquirer');
const sinon = require('sinon');
const { configHandler, managementSDKClient } = require('@contentstack/cli-utilities');
const mockData = require('../mock-data/common.mock.json');
const { getStacks, chooseBranch } = require('../../src/util/index');
const nock = require('nock');
const regionConfig = configHandler.get('region') || {};
const cma = regionConfig.cma || 'https://api.contentstack.io/v3';

describe('common utils', () => {
  let managementSdk;
  let sandbox;

  beforeEach(async () => {
    // Activate nock
    if (!nock.isActive()) {
      nock.activate();
    }
    
    managementSdk = await managementSDKClient({
      host: cma.replace('https://', ''),
    });
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
    if (nock.isActive()) {
      nock.restore();
    }
  });

  describe('getStacks', () => {
    it('should return a list of stacks for a given organization', async function() {
      // In PREPACK_MODE, managementSDKClient makes real HTTP requests that need to be mocked
      // Skip this test in PREPACK_MODE to avoid timeout
      if (process.env.NODE_ENV === 'PREPACK_MODE') {
        this.skip();
        return;
      }
      
      this.timeout(10000); // Increase timeout for this test
      sandbox.stub(inquirer, 'prompt').resolves({
        stack: mockData.stacks[0].name,
      });

      // Mock stack queries - match both with and without port number
      nock('https://api.contentstack.io')
        .get('/v3/stacks')
        .query((queryObject) => {
          if (queryObject.query) {
            try {
              const parsed = JSON.parse(queryObject.query);
              return parsed.org_uid === mockData.organizations[0].uid;
            } catch (e) {
              return false;
            }
          }
          return false;
        })
        .reply(200, { stacks: mockData.stacks });
      nock('https://api.contentstack.io:443')
        .get('/v3/stacks')
        .query((queryObject) => {
          if (queryObject.query) {
            try {
              const parsed = JSON.parse(queryObject.query);
              return parsed.org_uid === mockData.organizations[0].uid;
            } catch (e) {
              return false;
            }
          }
          return false;
        })
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
