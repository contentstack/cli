const fs = require('fs');
const { test, expect } = require('@oclif/test');
const { join } = require('path');
const { PassThrough } = require('stream');
const inquirer = require('inquirer');
const checkboxPlus = require('inquirer-checkbox-plus-prompt');
const { cliux, configHandler } = require('@contentstack/cli-utilities');

const mockData = require('../../mock-data/common.mock.json');

const { cma } = configHandler.get('region');
const directory = join(process.cwd(), 'data');
const taxonomyFileName = join(process.cwd(), 'data', mockData.stacks[0].name);

describe('export-to-csv with action taxonomies', () => {
  if(!fs.existsSync(directory)) fs.mkdirSync(directory);

  describe('Create taxonomies & terms csv file with all flags including taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false  })
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
      })
      .it('CSV file should be created');
  });

  describe('Create taxonomies & terms csv file with all flags excluding taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false  })
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
      })
      .it('file should be created');
  });

  describe('Create taxonomies & terms csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false })
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
  if (!fs.existsSync(directory)) fs.mkdirSync(directory);

  describe('Create entries csv file with flags', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false  })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get('/v3/environments').reply(200, {environments: mockData.environments});
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?count=true').reply(200, { content_types: 2 });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types').reply(200, {content_types: mockData.contentTypes} );
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&count=true`)
          .reply(200, { entries: 2 });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&skip=0&limit=100&include_workflow=true`)
          .reply(200, {entries: mockData.entry});
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
        mockData.contentTypes[0].uid,
      ])
      .it('Entries CSV file should be created');
  });

  describe('Create entries csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({
          action: 'entries',
          chosenOrg: mockData.organizations[0].name,
          chosenLanguage: mockData.locales[0].name,
          chosenStack: mockData.stacks[0].name,
          chosenContentTypes: [mockData.contentTypes[0].uid],
          branch: mockData.branch.uid,
        });
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
        api.get('/v3/environments').reply(200, { environments: mockData.environments });
      })
      .nock(cma, (api) => {
        api.get('/v3/locales').reply(200, { locales: mockData.locales });
      })
      .nock(cma, (api) => {
        api.get('/v3/stacks/branches').reply(200, { branches: mockData.branch });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?count=true').reply(200, { content_types: 2 });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?skip=0&include_branch=true').reply(200, { content_types: mockData.contentTypes });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=${mockData.locales[0].code}&count=true`,
          )
          .reply(200, { entries: 1 });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=${mockData.locales[0].code}&skip=0&limit=100&include_workflow=true`,
          )
          .reply(200, { entries: mockData.entry });
      })
      .command(['cm:export-to-csv'])
      .it('Entries CSV file should be created with prompt');
  });
});

describe('export-to-csv with action users', () => {
  describe('Export users csv file with flags', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false  })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users });
      })
      .command(['cm:export-to-csv', '--action', 'users', '--org', mockData.organizations[0].uid])
      .it('Users csv file should be successfully created');
  });

  describe('Export users csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === "true" || false  })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'users', chosenOrg: mockData.organizations[0].name });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users });
      })
      .command(['cm:export-to-csv'])
      .it('Users csv file should be successfully created');
  });
});
