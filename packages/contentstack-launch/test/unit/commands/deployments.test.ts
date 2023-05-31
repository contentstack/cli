import { describe, it } from 'mocha';
import Deployments from '../../../src/commands/launch/deployments';
import { cliux } from '@contentstack/cli-utilities';
import { testFlags } from '../mock';
import sinon, { stub } from 'sinon';
import { config } from 'dotenv';

config();
describe('Deployments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--org', process.env.ORG!, '-e', process.env.ENVIRONMENT!, '--project', process.env.PROJECT!];
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(tableStub);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for org when org flag is not passed', async function () {
    const args = ['-e', process.env.ENVIRONMENT!, '--project', process.env.PROJECT!];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(process.env.ORG);
    await Deployments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when project flag is not passed', async function () {
    const args = ['-e', process.env.ENVIRONMENT!, '--org', process.env.ORG!];
    const projectStub = stub(cliux, 'inquire').resolves(process.env.PROJECT!);
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(projectStub);
    projectStub.restore();
    tableStub.restore();
  });
  it('Should ask for environment when environment flag is not passed', async function () {
    const args = ['--org', process.env.ORG!, '--project', process.env.PROJECT!];
    const environmentStub = stub(cliux, 'inquire').resolves(process.env.ENVIRONMENT!);
    const tableStub = stub(cliux, 'table');
    await Deployments.run(args);
    sinon.assert.calledOnce(environmentStub);
    environmentStub.restore();
    tableStub.restore();
  });
  it('Should ask for organization with a warning when passed incorrect org uid', async function () {
    const args = ['--org', testFlags.invalidOrg.uid, '--project', process.env.PROJECT!, '-e', process.env.ENVIRONMENT!];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(process.env.ORG!);
    await Deployments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when passed incorrect project name', async function () {
    const args = ['--org', process.env.ORG!, '--project', testFlags.invalidProj, '-e', process.env.ENVIRONMENT!];
    const mock = sinon.mock(Deployments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const projectStub = stub(cliux, 'inquire').resolves(process.env.PROJECT!);
    await Deployments.run(args);
    sinon.assert.notCalled(projectStub);
    projectStub.restore();
    mock.verify();
    mock.restore();
  });
});
