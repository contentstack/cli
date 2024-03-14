const fs = require('fs');
const mkdirp = require('mkdirp');
const { test: fancy } = require('@oclif/test');
const { PassThrough } = require('stream');
const inquirer = require('inquirer');
const mockData = require('../../mock-data/common.mock.json');
const { configHandler } = require('@contentstack/cli-utilities');

const { cma } = configHandler.get('region');

describe('export-to-csv with action taxonomies', () => {
  const test = fancy.loadConfig({ root: process.cwd() });
  describe('Create taxonomies & terms csv file with all flags including taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}`)
          .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`,
          )
          .reply(200, mockData.taxonomyCSVData);
      })
      .command([
        'cm:export-to-csv',
        '--action',
        'taxonomies',
        '--taxonomy-uid',
        mockData.taxonomiesResp.taxonomies[0].uid,
        '--stack-api-key',
        mockData.stacks[0].api_key,
        '--org',
        mockData.organizations[0].uid,
      ])
      .it('CSV file should be created');
  });

  describe('Create taxonomies & terms csv file with all flags excluding taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get('/v3/taxonomies?include_count=true&limit=100&skip=0').reply(200, mockData.taxonomiesResp);
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`,
          )
          .reply(200, mockData.taxonomyCSVData);
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[1].uid}/export?format=csv`,
          )
          .reply(200, mockData.taxonomyCSVData);
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
      .it('file should be created');
  });

  describe('Create taxonomies & terms csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
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
          .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}`)
          .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`,
          )
          .reply(200, mockData.taxonomyCSVData);
      })
      .command(['cm:export-to-csv', '--taxonomy-uid', 'taxonomy_uid_1'])
      .it('CSV file should be created');
  });
});

describe('export-to-csv with action entries', () => {
  const test = fancy.loadConfig({ root: process.cwd() });
  describe('Create entries csv file with flags', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
          .reply(200, { stacks: mockData.stacks });
      })
      .nock(cma, (api) => {
        api.get('/v3/environments').reply(200, { environments: mockData.environments });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types?count=true').reply(200, { content_types: 2 });
      })
      .nock(cma, (api) => {
        api.get('/v3/content_types').reply(200, { content_types: mockData.contentTypes });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&count=true`,
          )
          .reply(200, { entries: 2 });
      })
      .nock(cma, (api) => {
        api
          .get(
            `/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=en1&skip=0&limit=100&include_workflow=true`,
          )
          .reply(200, { entries: mockData.entry });
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
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
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
  const test = fancy.loadConfig({ root: process.cwd() });
  describe('Export users csv file with flags', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] }).persist();
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
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
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'users', chosenOrg: mockData.organizations[0].name });
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[0] }).persist();
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/${mockData.organizations[0].uid}/roles`).reply(200, { roles: mockData.roles });
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

describe('Testing the teams support in cli export-to-csv', () => {
  const test = fancy.loadConfig({ root: process.cwd() });
  describe('Testing Teams Command with using org flag and team flag', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/org_uid_1_teams/roles`).reply(200, mockData.org_roles);
      })
      .nock(cma, (api) => {
        api.get(`/v3/roles`).reply(200, { roles: mockData.roless.roles });
      })
      .command(['cm:export-to-csv', '--action', 'teams', '--org', 'org_uid_1_teams', '--team-uid', 'team_1_uid'])
      .it('CSV file should be created');
  });

  describe('Testing Teams Command with using org flag and team flag and there are no teams', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/org_uid_1_teams/roles`).reply(200, mockData.org_roles);
      })
      .nock(cma, (api) => {
        api.get(`/v3/roles`).reply(200, { roles: mockData.roless.roles });
      })
      .command(['cm:export-to-csv', '--action', 'teams', '--org', 'org_uid_1_teams', '--team-uid', 'team_1_uid'])
      .it('CSV file should be created');
  });

  describe('Testing Teams Command with using org flag', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/org_uid_1_teams/roles`).reply(200, mockData.org_roles);
      })
      .nock(cma, (api) => {
        api.get(`/v3/roles`).reply(200, { roles: mockData.roless.roles });
      })
      .command(['cm:export-to-csv', '--action', 'teams', '--org', 'org_uid_1_teams'])
      .it('CSV file should be created');
  });

  describe('Testing Teams Command with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'teams', chosenOrg: mockData.organizations[2].name });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[2] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/org_uid_1_teams/roles`).reply(200, mockData.org_roles);
      })
      .nock(cma, (api) => {
        api.get(`/v3/roles`).reply(200, { roles: mockData.roless.roles });
      })
      .command(['cm:export-to-csv'])
      .it('CSV file should be created');
  });

  describe('Testing Teams Command with prompt and no stack role data', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .stub(inquirer, 'registerPrompt', () => {})
      .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'teams', chosenOrg: mockData.organizations[2].name, chooseExport: 'yes' });
      })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[2] });
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api.get(`/v3/organizations/org_uid_1_teams/roles`).reply(200, mockData.org_roles);
      })
      .nock(cma, (api) => {
        api.get(`/v3/roles`).reply(200, { roles: {} });
      })
      .command(['cm:export-to-csv'])
      .it('CSV file should be created');
  });
});
