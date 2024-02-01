import { expect, should } from 'chai';
import { stub, spy } from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import { cliux } from '@contentstack/cli-utilities';
import Conf from 'conf';
import { setEarlyAccessHeaderMockData } from '../mock/index';
import { interactive } from '../../../src/utils/index';

import GetEarlyAccessHeaderCommand from '../../../src/commands/config/get/early-access-header';
import SetEarlyAccessHeaderCommand from '../../../src/commands/config/set/early-access-header';
import RemoveEarlyAccessHeaderCommand from '../../../src/commands/config/remove/early-access-header';


const config = configHandler;
describe('Early access header command', function () {
    let configSetStub;
    let cliuxSuccessStub;
    let configHandlerDeleteStub;
    before(() => {
        configSetStub = stub(configHandler, 'set').returns({} as Conf<Record<string, unknown>>);
        cliuxSuccessStub = stub(cliux, 'success').callsFake(()=> {});
        configHandlerDeleteStub = stub(configHandler, 'delete').resolves("");
    });

    after(() => {
        // Restore the original method after each test
        configSetStub.restore();
        cliuxSuccessStub.restore();
        configHandlerDeleteStub.restore();
    });    
    
  it('Set early access header: with all flags, should be successful', async function () {
    const args = [
      '--header-alias',
      setEarlyAccessHeaderMockData.flags.headerAlias,
      '--header',
      setEarlyAccessHeaderMockData.flags.header,
    ];
    await SetEarlyAccessHeaderCommand.run(args);
    expect(cliuxSuccessStub.calledOnce).to.be.true;
  });

  it('Set early access header: should prompt when header alias is not passed', async () => {
    const askEarlyAccessHeaderAlias = stub(interactive, 'askEarlyAccessHeaderAlias').resolves(setEarlyAccessHeaderMockData.flags.headerAlias);
    await SetEarlyAccessHeaderCommand.run(["--header", setEarlyAccessHeaderMockData.flags.header]);
    expect(askEarlyAccessHeaderAlias.calledOnce).to.be.true;
    askEarlyAccessHeaderAlias.restore();
  });
    
  it('Set early access header: should prompt when header is not passed', async () => {
    const askEarlyAccessHeaderAlias = stub(interactive, 'askEarlyAccessHeaderValue').resolves(setEarlyAccessHeaderMockData.flags.header);
    await SetEarlyAccessHeaderCommand.run(["--header-alias", setEarlyAccessHeaderMockData.flags.headerAlias]);
    expect(askEarlyAccessHeaderAlias.calledOnce).to.be.true;
    askEarlyAccessHeaderAlias.restore();
  });
    
  it('Get early access header: with all flags, should be successful', async function () {
    const cliuxTableStub = stub(cliux, 'table');
    await GetEarlyAccessHeaderCommand.run([]);
    expect(cliuxTableStub.calledOnce).to.be.true;
    cliuxTableStub.restore();
  });
    
  it('Remove early access header: with all flags, should be successful', async function () {
    const configGetStub = stub(configHandler, 'get').resolves(setEarlyAccessHeaderMockData.flags.headerAlias);
    const args = [
      '--header-alias',
      setEarlyAccessHeaderMockData.flags.headerAlias,
      '--yes'
    ];
    await RemoveEarlyAccessHeaderCommand.run(args);
    expect(configHandlerDeleteStub.calledOnce).to.be.true;
    configGetStub.restore();
  });

  it('Remove early access header: with only alias flag should prompt for confirmation', async function () {   
    const configGetStub = stub(configHandler, 'get').resolves(setEarlyAccessHeaderMockData.flags.headerAlias);
      const confirmationStub = stub(interactive, 'askConfirmation').resolves(true);    
    const args = [
      '--header-alias',
      setEarlyAccessHeaderMockData.flags.headerAlias,
    ];
    await RemoveEarlyAccessHeaderCommand.run(args);
    expect(confirmationStub.calledOnce).to.be.true;
    configGetStub.restore();
    confirmationStub.restore()
  });
    
  it('Remove early access header: without alias flag should prompt', async function () {
    const configGetStub = stub(configHandler, 'get').resolves(setEarlyAccessHeaderMockData.flags.headerAlias);
      const askHeaderAliasStub = stub(interactive, 'askEarlyAccessHeaderAlias').resolves(setEarlyAccessHeaderMockData.flags.headerAlias);    
    const args = [
        "--yes"
    ];
    await RemoveEarlyAccessHeaderCommand.run(args);
      expect(askHeaderAliasStub.calledOnce).to.be.true;
      configGetStub.restore();
  });
});
