import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Environments from '../../../src/commands/launch/environments';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';
import sinon from 'sinon';

describe('Environments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '--project', deploymentFlags.project];
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    await Environments.run(args);
    sinon.assert.notCalled(inquireStub);
    sinon.assert.calledOnce(tableStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for project flag when project flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid];
    const tableStub = stub(cliux, 'table');
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    await Environments.run(args);
    sinon.assert.calledOnce(inquireStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for org flag when org flag is not passed', async function () {
    const args = ['--project', deploymentFlags.project];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.org.uid);
    await Environments.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for organization with a warning when passed incorrect org uid', async function () {
    const args = ['--org', deploymentFlags.invalidOrg.uid, '--project', deploymentFlags.project];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidOrg.uid);
    await Environments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when passed incorrect project name', async function () {
    const args = ['--org', deploymentFlags.org.uid, '--project', deploymentFlags.invalidProj];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const projectStub = stub(cliux, 'inquire').resolves(deploymentFlags.invalidProj);
    await Environments.run(args);
    sinon.assert.notCalled(projectStub);
    projectStub.restore();
    mock.verify();
    mock.restore();
  });
});
