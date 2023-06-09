import { describe, it } from 'mocha';
import { stub, mock as sinonMock, assert } from 'sinon';
import Open from '../../../src/commands/launch/open';
import { cliux } from '@contentstack/cli-utilities';
import { testFlags } from '../mock';
import { expect } from 'chai';
import { config } from 'dotenv';

config();

describe('Open Command', () => {
  it('should open the deployment URL in browser if all flags are passed', async function () {
    const args = ['--org', process.env.ORG!, '--project', process.env.PROJECT!, '-e', process.env.ENVIRONMENT!];
    const inquireStub = stub(cliux, 'inquire');
    const commandStub = stub(Open.prototype, 'run');
    await Open.run(args);
    assert.calledOnce(commandStub);
    assert.notCalled(inquireStub);
    inquireStub.restore();
    commandStub.restore();
  });
  it('Should ask for project flag when project flag is not passed', async function () {
    const spawnMock = stub(require('child_process'), 'spawn');
    // NOTE Set up the desired behavior for the mock
    const mockProcess = {
      stdout: {
        on: stub().yields('Mocked output'),
      },
      stderr: {
        on: stub().yields('Mocked error'),
      },
      on: stub().yields(0),
    };
    // NOTE Assign the mock behavior to the spawn function
    spawnMock.returns(mockProcess);
    const args = ['--org', process.env.ORG!, '-e', process.env.ENVIRONMENT!];
    const inquireStub = stub(cliux, 'inquire').resolves(process.env.PROJECT!);
    await Open.run(args);
    assert.calledOnce(inquireStub);
    inquireStub.restore();
    spawnMock.restore();
  });
  it('Should ask for org flag when org flag is not passed', async function () {
    const args = ['--project', process.env.PROJECT!, '-e', process.env.ENVIRONMENT!];
    const mock = sinonMock(Open);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const inquireStub = stub(cliux, 'inquire').resolves(process.env.ORG!);
    await Open.run(args);
    assert.notCalled(inquireStub);
    inquireStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for organization with a warning when passed incorrect org uid', async function () {
    const args = ['--org', testFlags.invalidOrg.uid, '--project', process.env.PROJECT!, '-e', process.env.ENVIRONMENT!];
    const mock = sinonMock(Open);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(testFlags.invalidOrg.uid);
    await Open.run(args);
    assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when passed incorrect project name', async function () {
    const spawnMock = stub(require('child_process'), 'spawn');
    const mockProcess = {
      stdout: {
        on: stub().yields('Mocked output'),
      },
      stderr: {
        on: stub().yields('Mocked error'),
      },
      on: stub().yields(0),
    };
    spawnMock.returns(mockProcess);
    const args = ['--org', process.env.ORG!, '--project', testFlags.invalidProj, '-e', process.env.ENVIRONMENT!];
    const projectStub = stub(cliux, 'inquire').resolves(process.env.PROJECT!);
    await Open.run(args);
    expect(projectStub.calledOnce);
    projectStub.restore();
    spawnMock.restore();
  });
});
