/* eslint-disable no-undef */
const { describe, it, beforeEach, afterEach } = require('mocha');
const ExportToCsvCommand = require('../../../src/commands/cm/export-to-csv');
const { stub, assert } = require('sinon');
const { config } = require('dotenv');
const inquirer = require('inquirer');
const { cliux } = require('@contentstack/cli-utilities');
const mockData = require('../../mock-data/common.mock.json');
const { test, expect } = require('@oclif/test');
const fs = require('fs');
const mkdirp = require('mkdirp');
const { configHandler } = require('@contentstack/cli-utilities');
const { kebabize } = require('../../../src/util/index');
const { cma } = configHandler.get('region');
const { PassThrough } = require('stream');

describe('Testing the teams support in cli export-to-csv',()=>{

  describe('Testing Teams Command with using org flag and team flag', () => {
      test
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
          api
            .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
            .reply(200, mockData.Teams.allTeams);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/organizations/org_uid_1_teams/roles`)
            .reply(200, mockData.org_roles);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/roles`)
            .reply(200, {roles: mockData.roless.roles});
        })
        .command([
          'cm:export-to-csv',
          '--action',
          'teams',
          '--org',
          'org_uid_1_teams',
          '--team-uid',
          'team_1_uid'
        ])
     .it('CSV file should be created');
  });
  describe('Testing Teams Command with using org flag and team flag and there are no teams', () => {
      test
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
          api
            .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
            .reply(200, mockData.Teams.allTeams);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/organizations/org_uid_1_teams/roles`)
            .reply(200, mockData.org_roles);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/roles`)
            .reply(200, {roles: mockData.roless.roles});
        })
        .command([
          'cm:export-to-csv',
          '--action',
          'teams',
          '--org',
          'org_uid_1_teams',
          '--team-uid',
          'team_1_uid'
        ])
     .it('CSV file should be created');
  });
  describe('Testing Teams Command with using org flag', () => {
      test
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(fs, 'createWriteStream', () => new PassThrough())
      .stub(mkdirp, 'sync', () => {})
      .stub(process, 'chdir', () => {})
      .nock(cma, (api) => {
          api
            .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
            .reply(200, mockData.Teams.allTeams);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/organizations/org_uid_1_teams/roles`)
            .reply(200,  mockData.org_roles);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/roles`)
            .reply(200, {roles: mockData.roless.roles});
        })
        .command([
          'cm:export-to-csv',
          '--action',
          'teams',
          '--org',
          'org_uid_1_teams'
        ])
     .it('CSV file should be created');
  });
  describe('Testing Teams Command with prompt', () => {
      test
      .stdout({ print: process.env.PRINT === 'true' || true })
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
            .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
            .reply(200, mockData.Teams.allTeams);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/organizations/org_uid_1_teams/roles`)
            .reply(200,  mockData.org_roles);
        })
        .nock(cma, (api) => {
          api
            .get(`/v3/roles`)
            .reply(200, {roles: mockData.roless.roles});
        })
        .command([
          'cm:export-to-csv'
        ])
     .it('CSV file should be created');
  });
  describe('Testing Teams Command with prompt and no stack role data', () => {
    test
    .stdout({ print: process.env.PRINT === 'true' || true })
    .stub(fs, 'createWriteStream', () => new PassThrough())
    .stub(mkdirp, 'sync', () => {})
    .stub(process, 'chdir', () => {})
    .stub(inquirer, 'registerPrompt', () => {})
    .stub(inquirer, 'prompt', () => {
        return Promise.resolve({ action: 'teams', chosenOrg: mockData.organizations[2].name,  chooseExport: 'yes'});
    })
      .nock(cma, (api) => {
        api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[2] });
      })
    .nock(cma, (api) => {
        api
          .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
          .reply(200, mockData.Teams.allTeams);
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/organizations/org_uid_1_teams/roles`)
          .reply(200,  mockData.org_roles);
      })
      .nock(cma, (api) => {
        api
          .get(`/v3/roles`)
          .reply(200, {roles: {}});
      })
      .command([
        'cm:export-to-csv'
      ])
   .it('CSV file should be created');
});
describe('Testing Teams Command with prompt and no stack role data', () => {
  test
  .stdout({ print: process.env.PRINT === 'true' || true })
  .stub(fs, 'createWriteStream', () => new PassThrough())
  .stub(mkdirp, 'sync', () => {})
  .stub(process, 'chdir', () => {})
  .stub(inquirer, 'registerPrompt', () => {})
  .stub(inquirer, 'prompt', () => {
      return Promise.resolve({ action: 'teams', chosenOrg: mockData.organizations[2].name,  chooseExport: 'no'});
  })
    .nock(cma, (api) => {
      api.get('/v3/user?include_orgs_roles=true').reply(200, { user: mockData.users[2] });
    })
  .nock(cma, (api) => {
      api
        .get(`/organizations/org_uid_1_teams/teams?skip=0&limit=100&includeUserDetails=true`)
        .reply(200, mockData.Teams.allTeams);
    })
    .nock(cma, (api) => {
      api
        .get(`/v3/organizations/org_uid_1_teams/roles`)
        .reply(200,  mockData.org_roles);
    })
    .nock(cma, (api) => {
      api
        .get(`/v3/roles`)
        .reply(200, {roles: {}});
    })
    .command([
      'cm:export-to-csv'
    ])
 .it('No CSV file should be created');
});
});