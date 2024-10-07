import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import GetRegionCommand from '../../../src/commands/config/get/region';
import { cliux } from '@contentstack/cli-utilities';
import { Region } from '../../../src/interfaces';
import UserConfig from '../../../src/utils/region-handler';

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
  it('should set a valid region', function () {
    const region = UserConfig.setRegion('NA');
    expect(region).to.have.property('name', 'NA');
  });

  it('should get the default region if none is set', function () {
    config.delete('region');
    const region = UserConfig.getRegion();
    expect(region).to.have.property('name', 'NA');
  });

  it('should set a custom region with valid data', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result.cma).to.equal(customRegion.cma);
    expect(result.cda).to.equal(customRegion.cda);
    expect(result.uiHost).to.equal(customRegion.uiHost);
    expect(result.name).to.equal(customRegion.name);
  });

  it('should throw an error for invalid custom region', function () {
    const invalidRegion = {
      name: 'Invalid Region',
      cma: 'invalid-url',
      cda: 'invalid-url',
    };

    expect(() => UserConfig.setCustomRegion(invalidRegion)).to.throw(TypeError, /valid cma/);
  });

  it('should validate a region object', function () {
    const validRegion = {
      name: 'Valid Region',
      cma: 'https://valid-cma.com',
      cda: 'https://valid-cda.com',
      uiHost: 'https://valid-ui.com',
    };

    const invalidRegion = {
      name: 'Invalid Region',
      cma: 'invalid-url',
      cda: 'invalid-url',
    };

    expect(UserConfig.validateRegion(validRegion)).to.be.true;
    expect(UserConfig.validateRegion(invalidRegion)).to.be.false;
  });
  //   it('Set region by flag, should be successful', async function () {});
  //   it('Set region by flag not existing, should throw an error', async function () {});
  //   it('Set region without flag, should set the default', async function () {});
});
