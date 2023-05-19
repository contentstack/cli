import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Environments from '../../../src/commands/launch/environments';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';

describe('Environments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '--project', deploymentFlags.project];
    const inquireStub = stub(cliux, 'inquire');
    const tableStub = stub(cliux, 'table');
    await Environments.run(args);
    expect(inquireStub.calledOnce).to.be.false;
    expect(tableStub.calledOnce);
    inquireStub.restore();
    tableStub.restore();
  });
  it('Should ask for project flag when project flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid];
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    await Environments.run(args);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
  it('Should ask for org flag when org flag is not passed', async function () {
    const args = ['--project', deploymentFlags.project];
    await Environments.run(args);
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.org.uid);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
});
