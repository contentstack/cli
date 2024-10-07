import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import GetRegionCommand from '../../../src/commands/config/get/region';
import { cliux } from '@contentstack/cli-utilities';
import { Region } from '../../../src/interfaces';

const config = configHandler;
describe('Region command', function () {
  const region: Region = {
    name: 'test',
    cma: 'https://api.contentstack.com',
    cda: 'https://cda.contentstack.com',
    uiHost: '',
    developerHubUrl: 'https://developerhub-api.contentstack.com',
    launchHubUrl: 'https://launch-api.contentstack.com',
    personalizeUrl: 'https://personalization-api.contentstack.com',
  };
  let cliuxPrintStub;
  beforeEach(function () {
    config.set('region', region.name);
    cliuxPrintStub = sinon.stub(cliux, 'print').callsFake(function () {});
  });
  afterEach(function () {
    cliuxPrintStub.restore();
  });
  it('Get region, should print region', async function () {
    await GetRegionCommand.run([]);
    expect(cliuxPrintStub.callCount).to.equal(7);
  });
  it('should log an error and exit when the region is not set', async function () {
    sinon.stub(process, 'exit').callsFake((code) => {
      throw new Error(`CLI_CONFIG_GET_REGION_NOT_FOUND EEXIT: ${code}`);
    });
    config.delete('region');
    let result;
    try {
      await GetRegionCommand.run([]);
    } catch (error) {
      result = error;
    }
    expect(result.message).to.include('CLI_CONFIG_GET_REGION_NOT_FOUND EEXIT: 1');
  });
  //   it('Set custom region, should be successful', async function () {});
  //   it('Set region by flag, should be successful', async function () {});
  //   it('Set region by flag not existing, should throw an error', async function () {});
  //   it('Set region without flag, should set the default', async function () {});
});
