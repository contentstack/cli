import { expect } from 'chai';
import ExportToCsv from '../../../dist/commands/cm/export-to-csv';

describe('cm:export-to-csv', () => {
  describe('command scaffolding', () => {
    it('should have the command file in place', () => {
      expect(ExportToCsv).to.exist;
      expect(ExportToCsv.description).to.be.a('string');
    });

    it('should have all expected flags defined', () => {
      const flagNames = Object.keys(ExportToCsv.flags);

      expect(flagNames).to.include('action');
      expect(flagNames).to.include('alias');
      expect(flagNames).to.include('org');
      expect(flagNames).to.include('stack-name');
      expect(flagNames).to.include('stack-api-key');
      expect(flagNames).to.include('org-name');
      expect(flagNames).to.include('locale');
      expect(flagNames).to.include('content-type');
      expect(flagNames).to.include('branch');
      expect(flagNames).to.include('team-uid');
      expect(flagNames).to.include('taxonomy-uid');
      expect(flagNames).to.include('include-fallback');
      expect(flagNames).to.include('fallback-locale');
      expect(flagNames).to.include('delimiter');
    });

    it('should have correct command description', () => {
      expect(ExportToCsv.description).to.include('Export');
      expect(ExportToCsv.description).to.include('csv');
    });

    it('should have examples defined', () => {
      expect(ExportToCsv.examples).to.be.an('array');
      expect(ExportToCsv.examples.length).to.be.greaterThan(0);
    });

    it('should have correct flag defaults', () => {
      const flags = ExportToCsv.flags;

      // include-fallback should default to false
      expect(flags['include-fallback'].default).to.equal(false);

      // delimiter should default to comma
      expect(flags['delimiter'].default).to.equal(',');
    });

    it('should have action flag with correct options', () => {
      const actionFlag = ExportToCsv.flags['action'] as { options?: string[] };
      expect(actionFlag.options).to.deep.equal(['entries', 'users', 'teams', 'taxonomies']);
    });
  });
});
