const fs = require('fs');
const mkdirp = require('mkdirp');
const { test, expect } = require('@oclif/test');
const { join } = require('path');
const { PassThrough } = require('stream');
const inquirer = require('inquirer');
const checkboxPlus = require('inquirer-checkbox-plus-prompt');
const { cliux, configHandler } = require('@contentstack/cli-utilities');

const mockData = require('../../mock-data/common.mock.json');

const { cma } = configHandler.get('region');
const directory = './data';
const taxonomyFileName = join(process.cwd(), 'data', mockData.stacks[0].name);
const userFileName = join(process.cwd(), 'data', mockData.organizations[0].name);

//!SECTION ------old test cases -------------

// config();

// describe('Export to csv command with action = entries', () => {
//   let inquireStub;
//   let errorStub;
//   let consoleLogStub;

//   beforeEach(() => {
//     inquireStub = stub(inquirer, 'prompt');
//     errorStub = stub(cliux, 'error');
//     consoleLogStub = stub(cliux, 'print');
//   });

//   afterEach(() => {
//     inquireStub.restore();
//     errorStub.restore();
//     consoleLogStub.restore();
//   });

//   it('Should ask for action when action is not passed (entries or users)', async () => {
//     await ExportToCsvCommand.run([]);
//     assert.calledOnce(inquireStub);
//   });

//   it('Should ask for org when org is not passed', async () => {
//     const args = ['--action', 'entries'];
//     await ExportToCsvCommand.run(args);
//     assert.calledOnce(inquireStub);
//   });

//   it('Should ask for stack when stack api key flag is not passed', async (done) => {
//     const args = ['--action', 'entries', '--org', process.env.ORG];
//     done();
//     await ExportToCsvCommand.run(args);
//     assert.calledOnce(inquireStub);
//   });

//   it('Should ask for branch when branch flag is not passed', async () => {
//     const args = ['--action', 'entries', '--org', process.env.ORG, '--stack-api-key', process.env.STACK];
//     await ExportToCsvCommand.run(args);
//     assert.calledTwice(inquireStub);
//   });

//   it('Should throw an error if stack does not have branches enabled', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG_WITH_NO_BRANCHES,
//       '--stack-api-key',
//       process.env.STACK_WITH_ORG_WITH_NO_BRANCHES,
//       '--branch',
//       'invalid',
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(
//       errorStub,
//       'Branches are not part of your plan. Please contact support@contentstack.com to upgrade your plan.',
//     );
//   });

//   it('Should ask for content type when content type flag is not passed', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG,
//       '--stack-api-key',
//       process.env.STACK,
//       '--branch',
//       process.env.BRANCH,
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledOnce(inquireStub);
//   });

//   it('Should create a file starting with the name passed as stack-name flag', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG,
//       '--stack-api-key',
//       process.env.STACK,
//       '--branch',
//       process.env.BRANCH,
//       '--content-type',
//       'page',
//       '--locale',
//       'en-us',
//       '--stack-name',
//       'okok',
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(consoleLogStub, `Writing entries to file: ${process.cwd()}/okok_page_en-us_entries_export.csv`);
//   });

//   it('Should throw an error when invalid org is passed', async () => {
//     const args = ['--action', 'entries', '--org', 'invalid'];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(errorStub, `Couldn't find the organization. Please check input parameters.`);
//   });

//   it('Should throw an error when invalid stack is passed', async () => {
//     const args = ['--action', 'entries', '--org', process.env.ORG, '--stack-api-key', 'invalid'];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(errorStub, 'Could not find stack');
//   });

//   it('Should throw an error when invalid branch is passed', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG,
//       '--stack-api-key',
//       process.env.STACK,
//       '--branch',
//       process.env.INVALID_BRANCH,
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(errorStub, 'Failed to fetch Branch. Please try again with valid parameters.');
//   });

//   it('Should throw an error when invalid contenttype is passed', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG,
//       '--stack-api-key',
//       process.env.STACK,
//       '--branch',
//       process.env.BRANCH,
//       '--content-type',
//       'invalid',
//       '--locale',
//       'en-us',
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(
//       errorStub,
//       `The Content Type invalid was not found. Please try again. Content Type is not valid.`,
//     );
//   });

//   it('Should throw an error when invalid locale is passed', async () => {
//     const args = [
//       '--action',
//       'entries',
//       '--org',
//       process.env.ORG,
//       '--stack-api-key',
//       process.env.STACK,
//       '--branch',
//       process.env.BRANCH,
//       '--content-type',
//       'header',
//       '--locale',
//       'invalid',
//     ];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(errorStub, 'Language was not found. Please try again.');
//   });
// });

// describe('Export to csv command with action = users', () => {
//   let inquireStub;
//   let errorStub;
//   let consoleLogStub;

//   beforeEach(() => {
//     inquireStub = stub(inquirer, 'prompt');
//     errorStub = stub(cliux, 'error');
//     consoleLogStub = stub(cliux, 'print');
//   });

//   afterEach(() => {
//     inquireStub.restore();
//     errorStub.restore();
//     consoleLogStub.restore();
//   });

//   it('Should ask for org when org is not passed', async () => {
//     const args = ['--action', 'entries'];
//     await ExportToCsvCommand.run(args);
//     assert.calledOnce(inquireStub);
//   });

//   it('Should write users data to file if the user has permissions', async () => {
//     const args = ['--action', 'users', '--org', process.env.ORG];

//     await ExportToCsvCommand.run(args);
//     assert.calledWith(
//       consoleLogStub,
//       `Writing organization details to file: ${process.cwd()}/${process.env.ORG}_users_export.csv`,
//     );
//   });

//   it('Should show an error that user does not have org permissions to perform the operation if user enters such org', async () => {
//     const args = ['--action', 'users', '--org', process.env.ORG_WITH_NO_PERMISSION];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(errorStub, `You don't have the permission to do this operation.`);
//   });

//   it('Should create a file starting with the name passed as org-name flag', async () => {
//     const args = ['--action', 'users', '--org', process.env.ORG, '--org-name', 'okok'];
//     await ExportToCsvCommand.run(args);
//     assert.calledWith(consoleLogStub, `Writing organization details to file: ${process.cwd()}/okok_users_export.csv`);
//   });
// });


//!SECTION  ----- test cases using @oclif/test -----------

describe('export-to-csv with action taxonomies', () => {
  describe('Create taxonomies & terms csv file with all flags including taxonomy uid', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(mkdirp, 'sync', () => directory)
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
      .stub(mkdirp, 'sync', () => directory)
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
        api
          .get('/v3/environments')
          .reply(200, mockData.environments);
      })
      .nock(cma, (api) => {
        api
          .get('/v3/stack/branches')
          .reply(200, { branch: mockData.branch });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/content_types?count=true')
          .reply(200, { count: 2 });
      })
      .nock(cma, (api) => {
        api
          .get('/v3/content_types')
          .reply(200, { resp: mockData.contentTypes });
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
        'test_branch1',
        '--locale',
        'en1',
        '--content-type',
        'ct1'
      ])
      .do(({ stdout }) => {
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`);
        //expect(stdout).to.contain(`Writing taxonomies to file: ${taxonomyFileName}_taxonomies.csv`)
      })
      .it('CSV file should be created');
  });

  // describe('Create entries csv file with prompt', () => {
  //   test
  //     .stdout({ print: process.env.PRINT === "true" || false })
  //     .stub(fs, 'existsSync', () => new PassThrough())
  //     .stub(fs, 'createWriteStream', () => new PassThrough())
  //     .stub(inquirer, 'registerPrompt', () => {})
  //     .stub(inquirer, 'prompt', () => {
  //       return Promise.resolve({
  //         action: 'taxonomies',
  //         chosenOrg: mockData.organizations[0].name,
  //         chosenStack: mockData.stacks[0].name,
  //       });
  //     })
  //     .nock(cma, (api) => {
  //       api
  //         .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
  //         .reply(200, { stacks: mockData.stacks });
  //     })
  //     .nock(cma, (api) => {
  //       api.get(`/v3/organizations?limit=100`).reply(200, { organizations: mockData.organizations });
  //     })
  //     .nock(cma, (api) => {
  //       api
  //         .get('/v3/taxonomies/taxonomy_uid_1?include_count=true&skip=0&limit=30')
  //         .reply(200, { taxonomy: mockData.taxonomiesResp.taxonomies[0] });
  //     })
  //     .nock(cma, (api) => {
  //       api
  //         .get('/v3/taxonomies/taxonomy_uid_1/terms?include_count=true&skip=0&limit=100')
  //         .reply(200, { terms: mockData.termsResp.terms, count: mockData.termsResp.count });
  //     })
  //     .command(['cm:export-to-csv', '--taxonomy-uid', 'taxonomy_uid_1'])
  //     .it('CSV file should be created');
  // });
});

describe('export-to-csv with action users', () => {
  describe('Export users csv file with flags', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(cliux, 'print', (msg) => console.log(msg))
      .stub(mkdirp, 'sync', () => directory)
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
          .reply(200, { users: mockData.users.items });
      })
      .command(['cm:export-to-csv', '--action', 'users', '--org', mockData.organizations[0].uid])
      // .do(({ stdout }) =>
      //   expect(stdout).to.contain(`Writing organization details to file: ${userFileName}_users_export.csv`),
      // )
      .it('Users csv file should be successfully created');
  });

  describe('Export users csv file with prompt', () => {
    test
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(cliux, 'print', (msg) => console.log(msg))
      .stub(mkdirp, 'sync', () => directory)
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

.nock(cma, (api) => {
  api
    .get(`/v3/stacks?&query={"org_uid":"${mockData.organizations[0].uid}"}`)
    .reply(200, { stacks: mockData.stacks });
})
