import { describe, it } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import Deployments from '../../../src/commands/launch/deployments';
import { cliux } from '@contentstack/cli-utilities';
import { deploymentFlags } from '../mock/mock';

describe('Deployments', () => {
  it('Should run the command when all the flags are passed', async function () {
    const commandStub = stub(Deployments.prototype, 'run');
    const inquireStub = stub(cliux, 'inquire');
    const args = [
      '--org',
      deploymentFlags.org,
      '--environment',
      deploymentFlags.environment,
      '--project',
      deploymentFlags.project,
    ];
    await Deployments.run(args);
    expect(commandStub.calledOnce).to.be.true;
    expect(inquireStub.called).to.be.false;
    commandStub.restore();
    inquireStub.restore();
  });
  it('Should ask for org when org flag is not passed', async function () {
    const args = ['--environment', deploymentFlags.environment, '--project', deploymentFlags.project];
    await Deployments.run(args);
  });
});
