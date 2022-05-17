import { expect } from 'chai';
import * as sinon from 'sinon';
import { cliux } from '../../src/utils';
import printRegionHook from '../../src/hooks/prerun/print-region';
import { configHandler } from '@contentstack/cli-utilities';

const config = configHandler

describe('Print region hook', function () {
  let printStub;
  before(function () {
    config.set('region', { name: 'NA', cda: 'https://cda.contentack.com', cma: 'https://cma.contentstack.com' });
  });
  beforeEach(function () {
    printStub = sinon.stub(cliux, 'print').callsFake(function (): Promise<any> {
      return Promise.resolve({ status: 200 });
    });
  });
  afterEach(function () {
    printStub.restore();
  });

  it('Prints region', async function () {
    await printRegionHook({ Command: { id: 'test' } });
    expect(printStub.calledOnce).to.be.true;
  });
  it('Throw error when no region set', async function () {
    config.delete('region');
    const context = {
      exit: function () {},
    };
    const contextMock = sinon.mock(context);
    await printRegionHook.call(context, { Command: { id: 'test' } });
    contextMock.expects('exit').once();
    contextMock.restore();
  });
  it('Run get region command, should not print the region from the hook', async function () {
    await printRegionHook({ Command: { id: 'config:get:region' } });
    expect(printStub.calledOnce).to.be.false;
  });
});
