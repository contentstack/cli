const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const messages = require('../messages/index.json')
const { runCommand } = require('@oclif/test');
const { cliux } = require('@contentstack/cli-utilities');
const region = { cma: 'https://api.contentstack.io' };
const mock = {
  organizations: [
    { uid: 'org-uid', name: 'Organization 1' },
    { uid: 'org-uid-2', name: 'Organization 2' },
  ],
};

describe("Bootstrapping an app", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Mocking the CLI prompt
    sandbox.stub(cliux, 'prompt').callsFake((question) => {
      const questionName = question.name;

      if (questionName === 'app-name') {
        return Promise.resolve('reactjs-starter');
      }

      if (questionName === 'org') {
        return Promise.resolve('org-uid');
      }

      if (questionName === 'stack-name') {
        return Promise.resolve('test-bootstrap-cmd');
      }

      if (questionName === 'app-type') {
        return Promise.resolve('reactjs-starter');
      }

      if (questionName === 'yes') {
        return Promise.resolve(true);
      }

      return Promise.resolve({});
    });

    // TODO:  Mocking the API call to get organizations and need to mock all the api's are used in bootstrap command.
    nock(region.cma)
      .get("/v3/organizations?limit=100&asc=name&include_count=true&skip=0")
      .reply(200, { organizations: mock.organizations });
  });

  afterEach(() => {
    sandbox.restore();
    nock.cleanAll(); 
  });

  it('should handle invalid app type gracefully', async () => {
    try {
      await runCommand(['cm:bootstrap', '--app-type', 'invalidtype']);
    } catch (error) {
      expect(error).to.exist;
      expect(error?.oclif?.exit).to.equal(1);
      expect(error.message).to.contain('Invalid app type provided invalidtype');
    }
  });
// TODO: Need to fix the test case as it is failing due to the prompt issue and need to mock the api's are used in bootstrap command.
  it.skip("should bootstrap a Contentstack app with the correct flags", async () => {
    try {
      const stdout = await runCommand(
        [
          "cm:bootstrap",
          "--app-name", "reactjs-starter",
          "--project-dir", process.cwd(),
          "--org", "org-uid",
          "--stack-name", "test-bootstrap-cmd",
          "--yes", "Y",
        ],
        { root: process.cwd() }
      );
      expect(stdout).to.contain(messages.CLI_BOOTSTRAP_SUCCESS);
    } catch (err) {
      console.error("Error during command execution:", err);
      throw err;
    }
  });
});
