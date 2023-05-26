import { describe, it } from 'mocha';
import { stub, mock as sinonMock, assert, replace } from 'sinon';
import Open from '../../../src/commands/launch/open';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';
import open from 'open';
import { test } from '@oclif/test';
import { expect } from 'chai';

describe('Open Command', () => {
  const obj = {
    open,
  };
  it('should open the deployment URL in browser if all flags are passed', async function () {
    const args = [
      '--org',
      deploymentFlags.org.uid,
      '--project',
      deploymentFlags.project,
      '-e',
      deploymentFlags.environment,
    ];
    const inquireStub = stub(cliux, 'inquire');
    const commandStub = stub(Open.prototype, 'run');
    await Open.run(args);
    assert.calledOnce(commandStub);
    assert.notCalled(inquireStub);
    inquireStub.restore();
    commandStub.restore();
  });
  it('Should ask for project flag when project flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '-e', deploymentFlags.environment];
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    const openStub = stub(obj, 'open');
    await Open.run(args);
    assert.calledOnce(openStub);
    assert.calledOnce(inquireStub);
    inquireStub.restore();
    openStub.restore();
  });
  // it('Should ask for org flag when org flag is not passed', async function () {
  //   const args = ['--project', deploymentFlags.project, '-e', deploymentFlags.environment];
  //   await Open.run(args);
  //   const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.org.uid);
  //   expect(inquireStub.calledOnce);
  //   inquireStub.restore();
  // });
  // it('Should ask for organization with a warning when passed incorrect org uid', async function () {
  //   const args = [
  //     '--org',
  //     deploymentFlags.invalidOrg.uid,
  //     '--project',
  //     deploymentFlags.project,
  //     '-e',
  //     deploymentFlags.environment,
  //   ];
  //   await Open.run(args);
  //   const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidOrg.uid);
  //   expect(orgStub.calledOnce);
  //   orgStub.restore();
  // });
  // it('Should ask for project when passed incorrect project name', async function () {
  //   const args = [
  //     '--org',
  //     deploymentFlags.org.uid,
  //     '--project',
  //     deploymentFlags.invalidProj,
  //     '-e',
  //     deploymentFlags.environment,
  //   ];
  //   await Open.run(args);
  //   const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidProj);
  //   expect(projectStub.calledOnce);
  //   projectStub.restore();
  // });
});
