import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import GetRegionCommand from '../../../src/commands/config/get/region';
import { cliux } from '@contentstack/cli-utilities';
import { Region } from '../../../src/interfaces';
import UserConfig from '../../../src/utils/region-handler';
import { askCustomRegion, askRegions } from '../../../src/utils/interactive';

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
  let cliuxPrintStub: sinon.SinonStub;
  let configGetStub: sinon.SinonStub;
  let configSetStub: sinon.SinonStub;
  beforeEach(function () {
    configGetStub = sinon.stub(config, 'get').callsFake((key) => {
      if (key === 'region') return region.name;
      return undefined;
    });
    configSetStub = sinon.stub(config, 'set').callsFake(function (key, value) {
      this[key] = value;
      return this;
    });
    cliuxPrintStub = sinon.stub(cliux, 'print').callsFake(function () {});
  });
  afterEach(function () {
    cliuxPrintStub.restore();
    configGetStub.restore();
    configSetStub.restore();
  });
  it('Get region, should print region', async function () {
    await GetRegionCommand.run([]);
    expect(cliuxPrintStub.callCount).to.equal(7);
  });
  it('should log an error and exit when the region is not set', async function () {
    configGetStub.callsFake((key) => {
      if (key === 'region') return undefined;
      return undefined;
    });
    sinon.stub(process, 'exit').callsFake((code) => {
      throw new Error(`CLI_CONFIG_GET_REGION_NOT_FOUND EEXIT: ${code}`);
    });
    let result;
    try {
      await GetRegionCommand.run([]);
    } catch (error) {
      result = error;
    }
    expect(result.message).to.include('CLI_CONFIG_GET_REGION_NOT_FOUND EEXIT: 1');
  });

  // Test cases for predefined regions
  describe('Predefined Regions', function () {
    it('should set NA region', function () {
      const result = UserConfig.setRegion('NA');
      expect(result).to.have.property('name', 'NA');
      expect(result.cma).to.equal('https://api.contentstack.io');
      expect(result.cda).to.equal('https://cdn.contentstack.io');
      expect(result.uiHost).to.equal('https://app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://launch-api.contentstack.com');
    });

    it('should set EU region', function () {
      const result = UserConfig.setRegion('EU');
      expect(result).to.have.property('name', 'EU');
      expect(result.cma).to.equal('https://eu-api.contentstack.com');
      expect(result.cda).to.equal('https://eu-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://eu-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://eu-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://eu-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://eu-launch-api.contentstack.com');
    });

    it('should set AU region', function () {
      const result = UserConfig.setRegion('AU');
      expect(result).to.have.property('name', 'AU');
      expect(result.cma).to.equal('https://au-api.contentstack.com');
      expect(result.cda).to.equal('https://au-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://au-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://au-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://au-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://au-launch-api.contentstack.com');
    });

    it('should set AWS-NA region', function () {
      const result = UserConfig.setRegion('AWS-NA');
      expect(result).to.have.property('name', 'AWS-NA');
      expect(result.cma).to.equal('https://api.contentstack.io');
      expect(result.cda).to.equal('https://cdn.contentstack.io');
      expect(result.uiHost).to.equal('https://app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://launch-api.contentstack.com');
    });

    it('should set AWS-EU region', function () {
      const result = UserConfig.setRegion('AWS-EU');
      expect(result).to.have.property('name', 'AWS-EU');
      expect(result.cma).to.equal('https://eu-api.contentstack.com');
      expect(result.cda).to.equal('https://eu-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://eu-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://eu-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://eu-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://eu-launch-api.contentstack.com');
    });

    it('should set AWS-AU region', function () {
      const result = UserConfig.setRegion('AWS-AU');
      expect(result).to.have.property('name', 'AWS-AU');
      expect(result.cma).to.equal('https://au-api.contentstack.com');
      expect(result.cda).to.equal('https://au-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://au-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://au-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://au-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://au-launch-api.contentstack.com');
    });

    it('should set AZURE-NA region', function () {
      const result = UserConfig.setRegion('AZURE-NA');
      expect(result).to.have.property('name', 'AZURE-NA');
      expect(result.cma).to.equal('https://azure-na-api.contentstack.com');
      expect(result.cda).to.equal('https://azure-na-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://azure-na-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://azure-na-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://azure-na-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://azure-na-launch-api.contentstack.com');
    });

    it('should set AZURE-EU region', function () {
      const result = UserConfig.setRegion('AZURE-EU');
      expect(result).to.have.property('name', 'AZURE-EU');
      expect(result.cma).to.equal('https://azure-eu-api.contentstack.com');
      expect(result.cda).to.equal('https://azure-eu-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://azure-eu-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://azure-eu-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://azure-eu-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://azure-eu-launch-api.contentstack.com');
    });

    it('should set GCP-NA region', function () {
      const result = UserConfig.setRegion('GCP-NA');
      expect(result).to.have.property('name', 'GCP-NA');
      expect(result.cma).to.equal('https://gcp-na-api.contentstack.com');
      expect(result.cda).to.equal('https://gcp-na-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://gcp-na-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://gcp-na-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://gcp-na-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://gcp-na-launch-api.contentstack.com');
    });

    it('should set GCP-EU region', function () {
      const result = UserConfig.setRegion('GCP-EU');
      expect(result).to.have.property('name', 'GCP-EU');
      expect(result.cma).to.equal('https://gcp-eu-api.contentstack.com');
      expect(result.cda).to.equal('https://gcp-eu-cdn.contentstack.com');
      expect(result.uiHost).to.equal('https://gcp-eu-app.contentstack.com');
      expect(result.developerHubUrl).to.equal('https://gcp-eu-developerhub-api.contentstack.com');
      expect(result.personalizeUrl).to.equal('https://gcp-eu-personalize-api.contentstack.com');
      expect(result.launchHubUrl).to.equal('https://gcp-eu-launch-api.contentstack.com');
    });

    it('should return undefined for invalid region', function () {
      const result = UserConfig.setRegion('INVALID-REGION');
      expect(result).to.be.undefined;
    });
  });

  it('should set a valid region', function () {
    const region = UserConfig.setRegion('AWS-NA');
    expect(region).to.have.property('name', 'AWS-NA');
  });

  it('should get the default region if none is set', function () {
    configGetStub.callsFake((key) => {
      if (key === 'region') return undefined;
      return undefined;
    });
    const region = UserConfig.getRegion();
    expect(region).to.have.property('name', 'AWS-NA');
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

  it('should set a custom region with developer hub URL', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
      developerHubUrl: 'https://custom-developer-hub.com',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result.developerHubUrl).to.equal(customRegion.developerHubUrl);
  });

  it('should set a custom region with personalize URL', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
      personalizeUrl: 'https://custom-personalize.com',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result.personalizeUrl).to.equal(customRegion.personalizeUrl);
  });

  it('should set a custom region with launch URL', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
      launchHubUrl: 'https://custom-launch.com',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result.launchHubUrl).to.equal(customRegion.launchHubUrl);
  });

  it('should set a custom region with all optional URLs', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
      developerHubUrl: 'https://custom-developer-hub.com',
      personalizeUrl: 'https://custom-personalize.com',
      launchHubUrl: 'https://custom-launch.com',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result).to.deep.equal(customRegion);
  });

  it('should sanitize region object to only include valid properties', function () {
    const customRegion = {
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
      name: 'Custom Region',
      developerHubUrl: 'https://custom-developer-hub.com',
      personalizeUrl: 'https://custom-personalize.com',
      launchHubUrl: 'https://custom-launch.com',
      invalidProperty: 'should be removed',
    };
    const result = UserConfig.setCustomRegion(customRegion);
    expect(result).to.not.have.property('invalidProperty');
  });
});

describe('Region Handler', function () {
  let inquireStub;
  beforeEach(function () {
    inquireStub = sinon.stub(cliux, 'inquire');
  });
  afterEach(function () {
    inquireStub.restore();
  });

  it('askRegions should return selected region', async function () {
    inquireStub.returns(Promise.resolve('AWS-NA'));
    const result = await askRegions();
    expect(result).to.equal('AWS-NA');
  });

  it('askCustomRegion should return custom region details', async function () {
    inquireStub.returns(Promise.resolve('Custom Region'));
    inquireStub.onCall(1).returns(Promise.resolve('https://custom-cma.com'));
    inquireStub.onCall(2).returns(Promise.resolve('https://custom-cda.com'));
    inquireStub.onCall(3).returns(Promise.resolve('https://custom-ui.com'));

    const result = await askCustomRegion();
    expect(result).to.deep.equal({
      name: 'Custom Region',
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
    });
  });
});
