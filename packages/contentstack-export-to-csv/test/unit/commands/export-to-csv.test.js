const fs = require('fs');
const { test, expect } = require('@oclif/test');
const { join } = require('path');
const { PassThrough } = require('stream');
const inquirer = require('inquirer');
const checkboxPlus = require('inquirer-checkbox-plus-prompt');
const { cliux, configHandler } = require('@contentstack/cli-utilities');

const mockData = require('../../mock-data/common.mock.json');

const { cma } = configHandler.get('region');
// const directory = './data';
const taxonomyFileName = join(process.cwd(), 'data', mockData.stacks[0].name);
//const userFileName = join(process.cwd(), 'data', mockData.organizations[0].name);

describe('export-to-csv with action taxonomies', () => {
  describe('Create taxonomies & terms csv file with all flags including taxonomy uid', () => {
    test
      .stdout({ print: true })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_1?include_count=true&skip=0&limit=30')
          .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_1/terms?include_count=true&skip=0&limit=100')
          .reply(200, { terms: mockData.termsResp.terms, count: mockData.termsResp.count });
      })
      .command([
        'cm:export-to-csv',
        '--action',
        'taxonomies',
        '--taxonomy-uid',
        'taxonomy_uid_1',
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
      ])
      .do(({ stdout }) => {
        expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`);
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`)
      })
      .it('CSV file should be created');
  });
  describe('Create taxonomies & terms csv file with all flags excluding taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies?include_count=true&skip=0&limit=100')
          .reply(200, { taxonomies: mockData.taxonomiesResp.taxonomies, count: mockData.taxonomiesResp.count });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_1/terms?include_count=true&skip=0&limit=100')
          .reply(200, { terms: mockData.termsResp.terms, count: mockData.termsResp.count });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_2/terms?include_count=true&skip=0&limit=100')
          .reply(200, { terms: [], count: 0 });
      })
      .command([
        'cm:export-to-csv',
        '--action',
        'taxonomies',
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
      ])
      .do(({ stdout }) => {
        expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`);
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`)
      })
      .it('file should be created');
  });
  describe('Create taxonomies & terms csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({
          action: 'taxonomies',
          chosenOrg: mockData.organizations[0].name,
          chosenStack: mockData.stacks[0].name,
        });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_1?include_count=true&skip=0&limit=30')
          .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/taxonomies/taxonomy_uid_1/terms?include_count=true&skip=0&limit=100')
          .reply(200, { terms: mockData.termsResp.terms, count: mockData.termsResp.count });
      })
      .command(['cm:export-to-csv', '--taxonomy-uid', 'taxonomy_uid_1'])
      .it('CSV file should be created');
  });
});

describe('export-to-csv with action entries', () => {
  describe('Create entries csv file with flags', () => {
    test
      .stdout({ print: true })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      //nock api for content type
      //nock api for list branches
      //nock api for branch
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get('/v3/environments').reply(200, mockData.environments);
      })
      .nock(cma, (api) => {
        api.get('/v3/stack/branches').reply(200, { branch: mockData.branch });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?count=true').reply(200, { count: 2 });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types').reply(200, { resp: mockData.contentTypes });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/content_types/${mockData.contentTypes.items[0].uid}/entries`)
          .reply(200, { entry: mockData.entry });
      })
      .command([
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
        mockData.contentTypes.items[0].uid,
      ])
      .do(({ stdout }) => {
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`);
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`)
      })
      .it('Entries CSV file should be created');
  });

  describe('Create entries csv file with prompt', () => {
    test
      .stdout({ print: true })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({
          action: 'entries',
          chosenOrg: mockData.organizations[0].name,
          chosenStack: mockData.stacks[0].name,
          chosenLanguage: 'en1',
          chosenContentTypes: mockData.contentTypes.items[0].uid,
          branch: mockData.branch.uid,
        });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get('/v3/environments').reply(200, mockData.environments);
      })
      .nock(cma, (api) => {
        api.get('/v3/stack/branches').reply(200, { branch: mockData.branch });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?count=true').reply(200, { count: 2 });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types').reply(200, { resp: mockData.contentTypes });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/content_types/${mockData.contentTypes.items[0].uid}/entries`)
          .reply(200, { entry: mockData.entry });
      })
      .command(['cm:export-to-csv'])
      .it('Entries CSV file should be created with prompt');
  });
});

describe('export-to-csv with action users', () => {
  describe('Export users csv file with flags', () => {
    test
      .stdout({ print: true })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users.items[0] });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users.items[0] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users });
      })
      .command(['cm:export-to-csv', '--action', 'users', '--org', mockData.organizations[0].uid])
      // .do(({ stdout }) =>
      //   expect(stdout).to.contain(`Writing organization details to file: ${userFileName}_users_export.csv`),
      // )
      .it('Users csv file should be successfully created');
  });
  
  describe('Export users csv file with prompt', () => {
    test
      .stdout({ print: true })
      .stub(fs, 'existsSync', () => new PassThrough())
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'users', chosenOrg: mockData.organizations[0].name });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users.items[0] });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users.items[0] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users.items });
      })
      .command(['cm:export-to-csv'])
      // .do(({ stdout }) =>
      //   expect(stdout).to.contain(`Writing organization details to file: ${userFileName}_users_export.csv`),
      // )
      .it('Users csv file should be successfully created');
  });
});
