import { expect } from 'chai';
import { csvParse } from '../../../dist/utils/csv-writer';

describe('csv-writer', () => {
  describe('module exports', () => {
    it('should export write function', async () => {
      const csvWriter = await import('../../../dist/utils/csv-writer');
      expect(csvWriter.write).to.be.a('function');
    });

    it('should export csvParse function', async () => {
      const csvWriter = await import('../../../dist/utils/csv-writer');
      expect(csvWriter.csvParse).to.be.a('function');
    });
  });

  describe('csvParse', () => {
    it('should parse CSV data and extract headers', async () => {
      const csvData = 'name,value\ntest1,100\ntest2,200';
      const headers: string[] = [];

      const result = await csvParse(csvData, headers);

      expect(headers).to.include('name');
      expect(headers).to.include('value');
      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal(['test1', '100']);
      expect(result[1]).to.deep.equal(['test2', '200']);
    });

    it('should not duplicate existing headers', async () => {
      const csvData = 'name,value\ntest,100';
      const headers: string[] = ['name']; // pre-existing header

      await csvParse(csvData, headers);

      // Should only have 2 headers, not 3
      expect(headers).to.have.lengthOf(2);
      expect(headers.filter(h => h === 'name')).to.have.lengthOf(1);
    });

    it('should handle empty CSV', async () => {
      const csvData = '';
      const headers: string[] = [];

      const result = await csvParse(csvData, headers);

      expect(result).to.have.lengthOf(0);
      expect(headers).to.have.lengthOf(0);
    });

    it('should handle CSV with only headers', async () => {
      const csvData = 'col1,col2,col3';
      const headers: string[] = [];

      const result = await csvParse(csvData, headers);

      expect(headers).to.deep.equal(['col1', 'col2', 'col3']);
      expect(result).to.have.lengthOf(0);
    });

    it('should handle CSV with special characters', async () => {
      const csvData = 'name,description\n"Test, Inc","A ""quoted"" value"';
      const headers: string[] = [];

      const result = await csvParse(csvData, headers);

      expect(headers).to.deep.equal(['name', 'description']);
      expect(result).to.have.lengthOf(1);
    });
  });

  // Note: The write() function modifies process.cwd() and writes to filesystem
  // These side effects are better tested via integration tests
});
