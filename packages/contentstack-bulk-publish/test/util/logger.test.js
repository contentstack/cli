const { getAllLogs, addLogs } = require('../../src/util/logger');

describe('testing for logger error cases', () => {
  it('error while getting logs', () => {
    getAllLogs('12719.PublishEntries.success');
  });

  it('unknown logging level while adding logs', () => {
    addLogs({}, {}, 'faketype');
  });
});
