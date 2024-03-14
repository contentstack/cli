import { expect, should } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import GetRegionCommand from '../../../src/commands/config/get/region';
import SetRegionCommand from '../../../src/commands/config/set/region';
import { cliux } from '@contentstack/cli-utilities';
import { Region } from '../../../src/interfaces';

const config = configHandler;
describe('Region command', function () {
  const region: Region = {
    name: 'test',
    cma: 'https://api.contentstack.com',
    cda: 'https://cda.contentstack.com',
    uiHost: '',
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
    expect(cliuxPrintStub.calledThrice).to.be.true;
  });
  it('Get region by not setting the region, should throw an error', async function () {
    config.delete('region');
    let result;
    try {
      result = await GetRegionCommand.run([]);
    } catch (error) {
      result = error;
    }
    expect(result).instanceOf(Error);
  });
  //   it('Set custom region, should be successful', async function () {});
  //   it('Set region by flag, should be successful', async function () {});
  //   it('Set region by flag not existing, should throw an error', async function () {});
  //   it('Set region without flag, should set the default', async function () {});
});
