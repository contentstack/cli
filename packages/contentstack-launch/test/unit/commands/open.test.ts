import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub, spy } from 'sinon';
import Open from '../../../src/commands/launch/open';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock';
import open from 'open';
describe('Open Command', () => {
  // it('should open the deployment URL in browser if all flags are passed', async function () {
  //   const args = [
  //     '--org',
  //     deploymentFlags.org.uid,
  //     '--project',
  //     deploymentFlags.project,
  //     '-e',
  //     deploymentFlags.environment,
  //   ];
  //   const inquireStub = stub(cliux, 'inquire');
  //   const printStub = stub(cliux, 'print');
  //   await Open.run(args);
  //   expect(inquireStub.calledOnce).to.be.false;
  //   expect(printStub.calledOnce);
  //   inquireStub.restore();
  //   printStub.restore();
  // });
  it('Should ask for project flag when project flag is not passed', async function () {
    const args = ['--org', deploymentFlags.org.uid, '-e', deploymentFlags.environment];
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.project);
    await Open.run(args);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
  it('Should ask for org flag when org flag is not passed', async function () {
    const args = ['--project', deploymentFlags.project];
    const inquireStub = stub(cliux, 'inquire').resolves(deploymentFlags.org.uid);
    await Open.run(args);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
});
