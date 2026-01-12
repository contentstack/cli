const { expect } = require('chai');
const ExportToCsv = require('../../src/commands/cm/export-to-csv.js');

describe('export to csv', () => {
  it('command should be defined and loadable', () => {
    expect(ExportToCsv).to.exist;
    expect(ExportToCsv.description).to.exist;
    expect(ExportToCsv.flags).to.exist;
  });

  it('command should have correct action options', () => {
    expect(ExportToCsv.flags.action).to.exist;
    expect(ExportToCsv.flags.action.options).to.include.members(['entries', 'users', 'teams', 'taxonomies']);
  });
});
