const { expect } = require('chai');
const nock = require('nock');
const fs = require('fs');
const inquirer = require('inquirer');
const { PassThrough } = require('stream');
const mockData = require('../../mock-data/common.mock.json');
const { configHandler } = require('@contentstack/cli-utilities');
const { runCommand } = require('@oclif/test')
const sinon = require('sinon');
const { cliux } = require('@contentstack/cli-utilities');

const { cma } = configHandler.get('region');
let sandbox;

describe('Export to CSV functionality', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(fs, 'createWriteStream').returns(new PassThrough())
    nock(cma)
      .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
      .reply(200, { stacks: mockData.stacks });
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  describe('Export taxonomies', () => {
    it('CSV file should be created with taxonomy uid', async () => {
      nock(cma)
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}`)
        .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] })
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`)
        .reply(200, mockData.taxonomyCSVData);

      const { stdout } = await runCommand([
        'cm:export-to-csv',
        '--action',
        'taxonomies',
        '--taxonomy-uid',
        mockData.taxonomiesResp.taxonomies[0].uid,
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
      ]);
      expect(stdout).to.include('Writing taxonomies to file:');
    });

    it('CSV file should be created without taxonomy uid', async () => {
      nock(cma)
        .get('/v3/taxonomies?include_count=true&limit=100&skip=0')
        .reply(200, mockData.taxonomiesResp)
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`)
        .reply(200, mockData.taxonomyCSVData)
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[1].uid}/export?format=csv`)
        .reply(200, mockData.taxonomyCSVData)

      const { stdout } = await runCommand([
        'cm:export-to-csv',
        '--action',
        'taxonomies',
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
      ]);
      expect(stdout).to.include('Writing taxonomies to file:');
    });
  });

  describe('Export entries', () => {
    it('Entries CSV file should be created with flags', async () => {
      nock(cma)
        .get(`/v3/environments`)
        .reply(200, { environments: mockData.environments })
        .get('/v3/content_types?count=true')
        .reply(200, { content_types: 2 })
        .get('/v3/content_types')
        .reply(200, { content_types: mockData.contentTypes })
        .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&count=true`)
        .reply(200, { entries: 1 })
        .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&skip=0&limit=100&include_workflow=true`)
        .reply(200, { entries: mockData.entry });

      const result = await runCommand([
        'cm:export-to-csv',
        '--action',
        'entries',
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
        '--branch',
        mockData.branch.uid,
        '--locale',
        'en1',
        '--content-type',
        mockData.contentTypes[0].uid,
      ]);
      expect(result.stdout).to.include('Writing entries to file:');
    });
  });
});
