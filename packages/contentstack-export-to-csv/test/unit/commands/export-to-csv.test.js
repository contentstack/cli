const { expect } = require('chai');
const nock = require('nock');
const fs = require('fs');
const inquirer = require('inquirer');
const { PassThrough } = require('stream');
const mockData = require('../../mock-data/common.mock.json');
const { configHandler } = require('@contentstack/cli-utilities');
const { runCommand } = require('@oclif/test')
const sinon = require('sinon');

const regionConfig = configHandler.get('region') || {};
const cma = regionConfig.cma || 'https://api.contentstack.io/v3';
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

    it('CSV file should be created using prompt', async () => {
      nock(cma)
        .get(`/v3/organizations?limit=100`)
        .reply(200, { organizations: mockData.organizations })
        .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
        .reply(200, { stacks: mockData.stacks })
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}`)
        .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] })
        .get(`/v3/taxonomies/${mockData.taxonomiesResp.taxonomies[0].uid}/export?format=csv`)
        .reply(200, mockData.taxonomyCSVData);

      sandbox.stub(process, 'chdir').returns(undefined);
      sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
        action: 'taxonomies',
        chosenOrg: mockData.organizations[0].name,
        chosenStack: mockData.stacks[0].name,
      }));

      const { stdout } = await runCommand(['cm:export-to-csv', '--taxonomy-uid', 'taxonomy_uid_1']);
      expect(stdout).to.include('Writing taxonomies to file');
      sandbox.restore();
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

    it('Entries CSV file should be created with prompt', async () => {
      sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
        action: 'entries',
        chosenOrg: mockData.organizations[0].name,
        chosenLanguage: mockData.locales[0].name,
        chosenStack: mockData.stacks[0].name,
        chosenContentTypes: [mockData.contentTypes[0].uid],
        branch: mockData.branch.uid,
      }));
      nock(cma)
        .get(`/v3/organizations?limit=100`)
        .reply(200, { organizations: mockData.organizations })
        .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
        .reply(200, { stacks: mockData.stacks })
        .get('/v3/environments')
        .reply(200, { environments: mockData.environments })
        .get('/v3/locales')
        .reply(200, { locales: mockData.locales })
        .get('/v3/stacks/branches')
        .reply(200, { branches: mockData.branch })
        .get('/v3/content_types?count=true')
        .reply(200, { content_types: 2 })
        .get('/v3/content_types?skip=0&include_branch=true')
        .reply(200, { content_types: mockData.contentTypes })
        .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=${mockData.locales[0].code}&count=true`)
        .reply(200, { entries: 1 })
        .get(`/v3/content_types/${mockData.contentTypes[0].uid}/entries?include_publish_details=true&locale=${mockData.locales[0].code}&skip=0&limit=100&include_workflow=true`)
        .reply(200, { entries: mockData.entry });
      const { stdout } = await runCommand(['cm:export-to-csv']);
      expect(stdout).to.include('Writing entries to file');
      sandbox.restore();
    });
  });

  describe("export-to-csv with action users", () => {
    describe("Export users CSV file with flags", () => {
      beforeEach(() => {
        nock(cma)
          .get('/v3/user?include_orgs_roles=true')
          .reply(200, { user: mockData.users[0] }).persist()
          .get(`/v3/organizations/${mockData.organizations[0].uid}/roles`)
          .reply(200, { roles: mockData.roles })
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users })
      });
      it("Users CSV file should be successfully created", async () => {
        const { stdout } = await runCommand(['cm:export-to-csv', '--action', 'users', '--org', mockData.organizations[0].uid]);
        expect(stdout).to.include("Writing organization details to file");
      });
    });

    describe("Export users CSV file with prompt", () => {
      it('Users CSV file should be successfully created', async () => {
        sandbox.stub(process, 'chdir').returns(undefined);
        sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
        sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
          action: 'users',
          chosenOrg: mockData.organizations[0].name,
        }));
        nock(cma)
          .get(`/v3/organizations?limit=100`)
          .reply(200, { organizations: mockData.organizations })
          .get('/v3/user?include_orgs_roles=true')
          .reply(200, { user: mockData.users[0] }).persist()
          .get(`/v3/organizations/${mockData.organizations[0].uid}/roles`)
          .reply(200, { roles: mockData.roles })
          .get(`/v3/organizations/${mockData.organizations[0].uid}/share?skip=0&page=1&limit=100`)
          .reply(200, { users: mockData.users });
        const { stdout } = await runCommand(['cm:export-to-csv']);
        expect(stdout).to.include('Writing organization details to file');
        sandbox.restore();
      });
    });
  })
});

describe("Testing teams support in CLI export-to-csv", () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
    nock.cleanAll();
  });

  describe("Testing Teams Command with org and team flags", () => {
    it("CSV file should be created", async () => {
      nock(cma)
        .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams)
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200, mockData.org_roles)
        .get(`/v3/roles`)
        .reply(200, { roles: mockData.roless.roles })

      const { stdout } = await runCommand([
        "cm:export-to-csv",
        "--action",
        "teams",
        "--org",
        "org_uid_1_teams",
        "--team-uid",
        "team_1_uid",
      ]);
      expect(stdout).to.include("Exporting the team with uid team_1_uid in Organisation org_uid_1_teams");
    });
  });

  describe("Testing Teams Command with no teams", () => {
    it("CSV file should be created", async () => {
      nock(cma)
        .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams)
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200, mockData.org_roles)
        .get(`/v3/roles`)
        .reply(200, { roles: mockData.roless.roles })

      const { stdout } = await runCommand([
        "cm:export-to-csv",
        "--action",
        "teams",
        "--org",
        "org_uid_1_teams",
        "--team-uid",
        "team_1_uid",
      ]);
      expect(stdout).to.include("Exporting the team with uid team_1_uid in Organisation org_uid_1_teams");
    });
  });

  describe("Testing Teams Command with org flag", () => {
    beforeEach(() => {
      nock(cma)
        .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams)
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200, mockData.org_roles)
        .get(`/v3/roles`)
        .reply(200, { roles: mockData.roless.roles })
    })
    it("CSV file should be created", async () => {
      const { stdout } = await runCommand([
        "cm:export-to-csv",
        "--action",
        "teams",
        "--org",
        "org_uid_1_teams",
      ]);
      expect(stdout).to.include("Exporting the teams of Organisation org_uid_1_teams");
    });
  });

  describe('Testing Teams Command with prompt', () => {
    it('CSV file should be created', async () => {
      sandbox.stub(process, 'chdir').returns(undefined);
      sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
        action: 'teams',
        chosenOrg: mockData.organizations[2].name,
      }));
      nock(cma)
        .get('/v3/user?include_orgs_roles=true')
        .reply(200, { user: mockData.users[2] })
        .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams)
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200, mockData.org_roles)
        .get(`/v3/roles`)
        .reply(200, { roles: mockData.roless.roles });

      const { stdout } = await runCommand(['cm:export-to-csv']);
      expect(stdout).to.include('Exporting the teams of Organisation Teams Org');
      sandbox.restore();
    });
  });

  describe('Testing Teams Command with prompt and no stack role data', () => {
    it('CSV file should be created', async () => {
      sandbox.stub(process, 'chdir').returns(undefined);
      sandbox.stub(inquirer, 'registerPrompt').returns(undefined);
      sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({
        action: 'teams',
        chosenOrg: mockData.organizations[2].name,
        chooseExport: 'yes',
      }));
      nock(cma)
        .get('/v3/user?include_orgs_roles=true')
        .reply(200, { user: mockData.users[2] })
        .get(`/v3/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams)
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200, mockData.org_roles)
        .get(`/v3/roles`)
        .reply(200, { roles: {} });

      const { stdout } = await runCommand(['cm:export-to-csv']);
      expect(stdout).to.include('Exporting the teams of Organisation Teams Org');
      sandbox.restore();
    });
  });
});
