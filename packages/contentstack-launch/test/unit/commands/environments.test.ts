import { describe, it } from 'mocha';
import Environments from '../../../src/commands/launch/environments';
import { cliux } from '@contentstack/cli-utilities';
import { testFlags } from '../mock';
import sinon, { stub } from 'sinon';
import { config } from 'dotenv';

config();

describe('Environments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--org', process.env.ORG!, '--project', process.env.PROJECT!];
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    await Environments.run(args);
    sinon.assert.notCalled(inquireStub);
    sinon.assert.calledOnce(tableStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for project flag when project flag is not passed', async function () {
    const args = ['--org', process.env.ORG!];
    const tableStub = stub(cliux, 'table');
    const inquireStub = stub(cliux, 'inquire').resolves(process.env.PROJECT!);
    await Environments.run(args);
    sinon.assert.calledOnce(inquireStub);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for org flag when org flag is not passed', async function () {
    const args = ['--project', process.env.PROJECT!];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const inquireStub = stub(cliux, 'inquire').resolves(process.env.ORG!);
    await Environments.run(args);
    sinon.assert.notCalled(inquireStub);
    inquireStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for organization with a warning when passed incorrect org uid', async function () {
    const args = ['--org', testFlags.invalidOrg.uid, '--project', process.env.PROJECT!];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const orgStub = stub(cliux, 'inquire').resolves(testFlags.invalidOrg.uid);
    await Environments.run(args);
    sinon.assert.notCalled(orgStub);
    orgStub.restore();
    mock.verify();
    mock.restore();
  });
  it('Should ask for project when passed incorrect project name', async function () {
    const args = ['--org', process.env.ORG!, '--project', testFlags.invalidProj];
    const mock = sinon.mock(Environments);
    const expectation = mock.expects('run');
    expectation.exactly(1);
    const projectStub = stub(cliux, 'inquire').resolves(testFlags.invalidProj);
    await Environments.run(args);
    sinon.assert.notCalled(projectStub);
    projectStub.restore();
    mock.verify();
    mock.restore();
  });
});
