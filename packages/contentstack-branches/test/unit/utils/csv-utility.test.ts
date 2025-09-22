import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub } from 'sinon';
import { join } from 'path';
import { cliux } from '@contentstack/cli-utilities';
import * as csvUtility from '../../../src/utils/csv-utility';
import { BranchDiffVerboseRes } from '../../../src/interfaces';

describe('CSV Utility Testcases', () => {
  let writeFileSyncStub, existsSyncStub, mkdirSyncStub, cliuxPrintStub;

  beforeEach(function () {
    writeFileSyncStub = stub(require('fs'), 'writeFileSync');
    existsSyncStub = stub(require('fs'), 'existsSync').returns(false);
    mkdirSyncStub = stub(require('fs'), 'mkdirSync');
    cliuxPrintStub = stub(cliux, 'print');
  });

  afterEach(function () {
    writeFileSyncStub.restore();
    existsSyncStub.restore();
    mkdirSyncStub.restore();
    cliuxPrintStub.restore();
  });

  describe('generateCSVDataFromVerbose', () => {
    it('should generate CSV data for modified content types with field changes', () => {
      // Use the actual structure that comes from parseVerbose
      const mockVerboseRes: BranchDiffVerboseRes = {
        modified: [
          {
            moduleDetails: {
              title: 'Test Content Type',
              uid: 'test_ct',
              status: 'modified',
              type: 'content_type'
            },
            modifiedFields: {
              modified: [
                {
                  path: 'title',
                  displayName: 'Title',
                  uid: 'title',
                  field: 'text',
                  propertyChanges: [
                    {
                      property: 'default_value',
                      changeType: 'modified',
                      oldValue: 'Old Title',
                      newValue: 'New Title'
                    }
                  ]
                }
              ],
              added: [
                {
                  path: 'new_field',
                  displayName: 'New Field',
                  uid: 'new_field',
                  field: 'text'
                }
              ],
              deleted: [
                {
                  path: 'old_field',
                  displayName: 'Old Field',
                  uid: 'old_field',
                  field: 'text'
                }
              ]
            }
          }
        ],
        added: [
          {
            title: 'New Content Type',
            uid: 'new_ct',
            status: 'added',
            type: 'content_type'
          }
        ],
        deleted: [
          {
            title: 'Deleted Content Type',
            uid: 'deleted_ct',
            status: 'deleted',
            type: 'content_type'
          }
        ]
      };

      const result = csvUtility.generateCSVDataFromVerbose(mockVerboseRes);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(5); // 1 modified property change + 1 added + 1 deleted + 1 added CT + 1 deleted CT

      // Check modified field
      const modifiedRow = result.find(row => row.fieldName === 'Title');
      expect(modifiedRow).to.exist;
      expect(modifiedRow?.operation).to.equal('modified');
      expect(modifiedRow?.sourceBranchValue).to.equal('New Title');
      expect(modifiedRow?.targetBranchValue).to.equal('Old Title');

      // Check added field
      const addedRow = result.find(row => row.fieldName === 'New Field');
      expect(addedRow).to.exist;
      expect(addedRow?.operation).to.equal('added');
      expect(addedRow?.sourceBranchValue).to.equal('N/A');
      expect(addedRow?.targetBranchValue).to.equal('new_field');

      // Check deleted field
      const deletedRow = result.find(row => row.fieldName === 'Old Field');
      expect(deletedRow).to.exist;
      expect(deletedRow?.operation).to.equal('deleted');
      expect(deletedRow?.sourceBranchValue).to.equal('old_field');
      expect(deletedRow?.targetBranchValue).to.equal('N/A');

      // Check added content type
      const addedCTRow = result.find(row => row.contentTypeName === 'New Content Type');
      expect(addedCTRow).to.exist;
      expect(addedCTRow?.operation).to.equal('added');
      expect(addedCTRow?.sourceBranchValue).to.equal('N/A');
      expect(addedCTRow?.targetBranchValue).to.equal('N/A');

      // Check deleted content type
      const deletedCTRow = result.find(row => row.contentTypeName === 'Deleted Content Type');
      expect(deletedCTRow).to.exist;
      expect(deletedCTRow?.operation).to.equal('deleted');
      expect(deletedCTRow?.sourceBranchValue).to.equal('N/A');
      expect(deletedCTRow?.targetBranchValue).to.equal('N/A');
    });

    it('should handle empty verbose results gracefully', () => {
      const emptyVerboseRes: BranchDiffVerboseRes = {
        modified: [],
        added: [],
        deleted: []
      };

      const result = csvUtility.generateCSVDataFromVerbose(emptyVerboseRes);

      expect(result).to.be.an('array');
      expect(result.length).to.equal(0);
    });
  });

  describe('exportCSVReport', () => {
    it('should export CSV report to custom path and create directory if needed', () => {
      const mockDiffData: BranchDiffVerboseRes = {
        modified: [],
        added: [],
        deleted: [],
        csvData: [
          {
            srNo: 1,
            contentTypeName: 'Test CT',
            fieldName: 'Test Field',
            fieldPath: 'N/A',
            operation: 'modified',
            sourceBranchValue: 'new_value',
            targetBranchValue: 'old_value'
          }
        ]
      };

      const customPath = '/tmp/test-csv';
      const moduleName = 'content-types';

      csvUtility.exportCSVReport(moduleName, mockDiffData, customPath);

      // Verify directory creation
      expect(existsSyncStub.calledWith(customPath)).to.be.true;
      expect(mkdirSyncStub.calledWith(customPath, { recursive: true })).to.be.true;

      // Verify file writing
      expect(writeFileSyncStub.calledOnce).to.be.true;
      const [filePath, content] = writeFileSyncStub.getCall(0).args;
      expect(filePath).to.equal(join(customPath, 'content-types-diff.csv'));

      // Verify CSV content
      expect(content).to.include('Sr No,Content Type Name,Field Name,Field Path,Operation,Source Branch Value,Target Branch Value');
      expect(content).to.include('1,"Test CT","Test Field","N/A","modified","new_value","old_value"');

      // Verify success message
      expect(cliuxPrintStub.calledWith(`CSV report generated at: ${join(customPath, 'content-types-diff.csv')}`, { color: 'green' })).to.be.true;
    });

    it('should export CSV report to current directory when no custom path provided', () => {
      const mockDiffData: BranchDiffVerboseRes = {
        modified: [],
        added: [],
        deleted: [],
        csvData: [
          {
            srNo: 1,
            contentTypeName: 'Test CT',
            fieldName: 'Test Field',
            fieldPath: 'N/A',
            operation: 'added',
            sourceBranchValue: 'N/A',
            targetBranchValue: ''
          }
        ]
      };

      const moduleName = 'global-fields';

      csvUtility.exportCSVReport(moduleName, mockDiffData);

      // Verify file writing to current directory
      expect(writeFileSyncStub.calledOnce).to.be.true;
      const [filePath] = writeFileSyncStub.getCall(0).args;
      expect(filePath).to.equal(join(process.cwd(), 'global-fields-diff.csv'));

      // Verify success message
      expect(cliuxPrintStub.calledWith(`CSV report generated at: ${join(process.cwd(), 'global-fields-diff.csv')}`, { color: 'green' })).to.be.true;
    });
  });
});
