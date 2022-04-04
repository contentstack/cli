import { expect } from 'chai';
import * as nock from 'nock';
import * as sinon from 'sinon';
import { Analytics, UserConfig, CLIError } from '../src/utils';
import { Region } from '../src/interfaces';

describe('Utils', function () {
  const userConfig = new UserConfig();
  before(function () {
    nock('http://www.google-analytics.com').post('/collect').reply(200);
  });
  describe('Analytics', function () {
    it('track events', async function () {
      const analytics = new Analytics({ trackingID: 'testid', cid: 'testcid' });
      const result = await analytics.track('test', { category: 'test', label: 'test', os: 'test' });
      expect(result.status).equal(200);
    });
  });

  describe('User config', function () {
    it('set region, should be successful', function () {
      const result: Region = userConfig.setRegion('NA');
      expect(result.name).equal('NA');
    });
    it('get region, should be successful', function () {
      expect(userConfig.getRegion().name).equal('NA');
    });
    it('set custom region, should be successful', function () {
      const customRegion = {
        name: 'test',
        cda: 'https://api.contentstack.io',
        cma: 'https://cdn.contentstack.io',
      };
      expect(userConfig.setCustomRegion(customRegion).name).equal('test');
    });
    it('set custom region with invalid payload, throw exception', function () {
      const customRegion = {
        cda: 'testcda',
        cma: 'testcma',
      };
      let result;
      try {
        result = userConfig.setCustomRegion(customRegion);
      } catch (error) {
        result = error;
      }
      expect(result).instanceOf(CLIError);
    });
  });
});
