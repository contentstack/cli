import { describe, it } from 'mocha';
import { stub } from 'sinon';
import Deployments from '../../../src/commands/launch/deployments';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';
import sinon from 'sinon';

describe('Deployments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = [
      '--org',
      deploymentFlags.org.uid,
      '-e',
      deploymentFlags.environment,
      '--project',
      deploymentFlags.project,
    ];
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(tableStub);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for org when org flag is not passed', async function () {
    const args = ['-e', deploymentFlags.environment, '--project', deploymentFlags.project];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.org);
    await Deployments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when project flag is not passed', async function () {
    const args = ['-e', deploymentFlags.environment, '--org', deploymentFlags.org.uid];
    const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(projectStub);
    projectStub.restore();
    tableStub.restore();
  });
  it('Should ask for environment when environment flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '--project', deploymentFlags.project];
    const environmentStub = stub(cliux, 'inquire').resolves(deploymentFlags.environment);
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(environmentStub);
    environmentStub.restore();
    tableStub.restore();
  });
  it('Should ask for organization with a warning when passed incorrect org uid', async function () {
    const args = [
      '--org',
      deploymentFlags.invalidOrg.uid,
      '--project',
      deploymentFlags.project,
      '-e',
      deploymentFlags.environment,
    ];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.org.uid);
    await Deployments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when passed incorrect project name', async function () {
    const args = [
      '--org',
      deploymentFlags.org.uid,
      '--project',
      deploymentFlags.invalidProj,
      '-e',
      deploymentFlags.environment,
    ];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    await Deployments.run(args);
    sinon.assert.notCalled(projectStub);
    projectStub.restore();
    mock.verify();
    mock.restore();
  });
});
