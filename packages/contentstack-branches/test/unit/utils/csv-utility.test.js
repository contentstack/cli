"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const path_1 = require("path");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const csvUtility = tslib_1.__importStar(require("../../../src/utils/csv-utility"));
(0, mocha_1.describe)('CSV Utility Testcases', () => {
    let writeFileSyncStub, existsSyncStub, mkdirSyncStub, cliuxPrintStub;
    (0, mocha_1.beforeEach)(function () {
        writeFileSyncStub = (0, sinon_1.stub)(require('fs'), 'writeFileSync');
        existsSyncStub = (0, sinon_1.stub)(require('fs'), 'existsSync').returns(false);
        mkdirSyncStub = (0, sinon_1.stub)(require('fs'), 'mkdirSync');
        cliuxPrintStub = (0, sinon_1.stub)(cli_utilities_1.cliux, 'print');
    });
    (0, mocha_1.afterEach)(function () {
        writeFileSyncStub.restore();
        existsSyncStub.restore();
        mkdirSyncStub.restore();
        cliuxPrintStub.restore();
    });
    (0, mocha_1.describe)('generateCSVDataFromVerbose', () => {
        (0, mocha_1.it)('should generate CSV data for modified content types with field changes', () => {
            // Use the actual structure that comes from parseVerbose
            const mockVerboseRes = {
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
            (0, chai_1.expect)(result).to.be.an('array');
            (0, chai_1.expect)(result.length).to.equal(5); // 1 modified property change + 1 added + 1 deleted + 1 added CT + 1 deleted CT
            // Check modified field
            const modifiedRow = result.find(row => row.fieldName === 'Title');
            (0, chai_1.expect)(modifiedRow).to.exist;
            (0, chai_1.expect)(modifiedRow === null || modifiedRow === void 0 ? void 0 : modifiedRow.operation).to.equal('modified');
            (0, chai_1.expect)(modifiedRow === null || modifiedRow === void 0 ? void 0 : modifiedRow.sourceBranchValue).to.equal('New Title');
            (0, chai_1.expect)(modifiedRow === null || modifiedRow === void 0 ? void 0 : modifiedRow.targetBranchValue).to.equal('Old Title');
            // Check added field
            const addedRow = result.find(row => row.fieldName === 'New Field');
            (0, chai_1.expect)(addedRow).to.exist;
            (0, chai_1.expect)(addedRow === null || addedRow === void 0 ? void 0 : addedRow.operation).to.equal('added');
            (0, chai_1.expect)(addedRow === null || addedRow === void 0 ? void 0 : addedRow.sourceBranchValue).to.equal('N/A');
            (0, chai_1.expect)(addedRow === null || addedRow === void 0 ? void 0 : addedRow.targetBranchValue).to.equal('new_field');
            // Check deleted field
            const deletedRow = result.find(row => row.fieldName === 'Old Field');
            (0, chai_1.expect)(deletedRow).to.exist;
            (0, chai_1.expect)(deletedRow === null || deletedRow === void 0 ? void 0 : deletedRow.operation).to.equal('deleted');
            (0, chai_1.expect)(deletedRow === null || deletedRow === void 0 ? void 0 : deletedRow.sourceBranchValue).to.equal('old_field');
            (0, chai_1.expect)(deletedRow === null || deletedRow === void 0 ? void 0 : deletedRow.targetBranchValue).to.equal('N/A');
            // Check added content type
            const addedCTRow = result.find(row => row.contentTypeName === 'New Content Type');
            (0, chai_1.expect)(addedCTRow).to.exist;
            (0, chai_1.expect)(addedCTRow === null || addedCTRow === void 0 ? void 0 : addedCTRow.operation).to.equal('added');
            (0, chai_1.expect)(addedCTRow === null || addedCTRow === void 0 ? void 0 : addedCTRow.sourceBranchValue).to.equal('N/A');
            (0, chai_1.expect)(addedCTRow === null || addedCTRow === void 0 ? void 0 : addedCTRow.targetBranchValue).to.equal('N/A');
            // Check deleted content type
            const deletedCTRow = result.find(row => row.contentTypeName === 'Deleted Content Type');
            (0, chai_1.expect)(deletedCTRow).to.exist;
            (0, chai_1.expect)(deletedCTRow === null || deletedCTRow === void 0 ? void 0 : deletedCTRow.operation).to.equal('deleted');
            (0, chai_1.expect)(deletedCTRow === null || deletedCTRow === void 0 ? void 0 : deletedCTRow.sourceBranchValue).to.equal('N/A');
            (0, chai_1.expect)(deletedCTRow === null || deletedCTRow === void 0 ? void 0 : deletedCTRow.targetBranchValue).to.equal('N/A');
        });
        (0, mocha_1.it)('should handle empty verbose results gracefully', () => {
            const emptyVerboseRes = {
                modified: [],
                added: [],
                deleted: []
            };
            const result = csvUtility.generateCSVDataFromVerbose(emptyVerboseRes);
            (0, chai_1.expect)(result).to.be.an('array');
            (0, chai_1.expect)(result.length).to.equal(0);
        });
    });
    (0, mocha_1.describe)('exportCSVReport', () => {
        (0, mocha_1.it)('should export CSV report to custom path and create directory if needed', () => {
            const mockDiffData = {
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
            (0, chai_1.expect)(existsSyncStub.calledWith(customPath)).to.be.true;
            (0, chai_1.expect)(mkdirSyncStub.calledWith(customPath, { recursive: true })).to.be.true;
            // Verify file writing
            (0, chai_1.expect)(writeFileSyncStub.calledOnce).to.be.true;
            const [filePath, content] = writeFileSyncStub.getCall(0).args;
            (0, chai_1.expect)(filePath).to.equal((0, path_1.join)(customPath, 'content-types-diff.csv'));
            // Verify CSV content
            (0, chai_1.expect)(content).to.include('Sr No,Content Type Name,Field Name,Field Path,Operation,Source Branch Value,Target Branch Value');
            (0, chai_1.expect)(content).to.include('1,"Test CT","Test Field","N/A","modified","new_value","old_value"');
            // Verify success message
            (0, chai_1.expect)(cliuxPrintStub.calledWith(`CSV report generated at: ${(0, path_1.join)(customPath, 'content-types-diff.csv')}`, { color: 'green' })).to.be.true;
        });
        (0, mocha_1.it)('should export CSV report to current directory when no custom path provided', () => {
            const mockDiffData = {
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
            (0, chai_1.expect)(writeFileSyncStub.calledOnce).to.be.true;
            const [filePath] = writeFileSyncStub.getCall(0).args;
            (0, chai_1.expect)(filePath).to.equal((0, path_1.join)(process.cwd(), 'global-fields-diff.csv'));
            // Verify success message
            (0, chai_1.expect)(cliuxPrintStub.calledWith(`CSV report generated at: ${(0, path_1.join)(process.cwd(), 'global-fields-diff.csv')}`, { color: 'green' })).to.be.true;
        });
    });
});
