const retryFailed = require('../../src/util/retryfailed');
const dummyConfig = require('../dummy/config');
const Queue = require('../../src/util/queue');

const mockedLog = () => { };
console.log = mockedLog;

const queue = getQueue();
queue.config = dummyConfig;
queue.consumer = mockedLog;

const bulkPublishEntriesLog = '1587758242717.bulkPublishEntries.success';
const publishEntriesLog = '1587758242718.PublishEntries.success';
const publishAssetLog = '1587956283100.PublishAssets.success';
const emptyLog = '1587758242718.bulkPublishEntries.success';

describe('testing retryFailed', () => {
  it('testing with bulkpublish log', async () => {
    expect(await retryFailed(bulkPublishEntriesLog, queue, 'bulk')).toBeUndefined();
  });

  it('testing with regular publish log', async () => {
    expect(await retryFailed(publishEntriesLog, { entryQueue: queue }, 'publish')).toBeUndefined();
  });

  it('testing with asset publish log', async () => {
    expect(await retryFailed(publishAssetLog, { assetQueue: queue }, 'publish')).toBeUndefined();
  });

  it('testing with empty publish log', async () => {
    expect(await retryFailed(emptyLog, { entryQueue: queue }, 'publish')).toBeUndefined();
  });
});
