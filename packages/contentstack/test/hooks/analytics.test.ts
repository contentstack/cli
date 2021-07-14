import { expect } from 'chai';
import * as sinon from 'sinon';
import { Analytics } from '../../src/utils';
import analyticsHook from '../../src/hooks/prerun/analytics';

describe('Analytics hook', function () {
  let analyticsTrackerStub;
  before(function () {
    analyticsTrackerStub = sinon
      .stub(Analytics.prototype, 'track')
      .callsFake(function (
        action: string,
        analyticsOpts: { category: string; label: string; os: string },
      ): Promise<any> {
        return Promise.resolve({ status: 200 });
      });
  });
  after(function () {
    analyticsTrackerStub.restore();
  });

  it('track events', async function () {
    await analyticsHook.call(
      { config: { version: 'test', userAgent: 'test' } },
      { Command: { id: 'test', plugin: { name: 'test' } } },
    );
    expect(analyticsTrackerStub.called).to.be.true;
  });
});
