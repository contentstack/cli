import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Deployments from '../../../src/commands/launch/deployments';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';

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
    await Deployments.run(args);
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    expect(inquireStub.called).to.be.false;
    expect(tableStub.calledOnce);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for org when org flag is not passed', async function () {
    const args = ['-e', deploymentFlags.environment, '--project', deploymentFlags.project];
    await Deployments.run(args);
    const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.org);
    expect(orgStub.calledOnce);
    orgStub.restore();
  });
  it('Should ask for project when project flag is not passed', async function () {
    const args = ['-e', deploymentFlags.environment, '--org', deploymentFlags.org.uid];
    await Deployments.run(args);
    const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    expect(projectStub.calledOnce);
    projectStub.restore();
  });
  it('Should ask for environment when environment flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '--project', deploymentFlags.project];
    await Deployments.run(args);
    const environmentStub = stub(cliux, 'inquire').resolves(deploymentFlags.environment);
    expect(environmentStub.calledOnce);
    environmentStub.restore();
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
    await Deployments.run(args);
    const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidOrg.uid);
    expect(orgStub.calledOnce);
    orgStub.restore();
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
    await Deployments.run(args);
    const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidProj);
    expect(projectStub.calledOnce);
    projectStub.restore();
  });
});
