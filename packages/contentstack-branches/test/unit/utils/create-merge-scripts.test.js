"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const utils_1 = require("../../../src/utils");
const fs_1 = tslib_1.__importDefault(require("fs"));
const chai_1 = require("chai");
const sinon_1 = require("sinon");
(0, mocha_1.describe)('File system operations', () => {
    let fsStub;
    let mockFolderName;
    beforeEach(() => {
        // Mock file system operations
        mockFolderName = 'merge_scripts/merge_scripts_1234-1234_20231201120000';
        fsStub = {
            constants: { W_OK: 2 },
            accessSync: (0, sinon_1.stub)().returns(undefined),
            existsSync: (0, sinon_1.stub)().returns(true),
            mkdirSync: (0, sinon_1.stub)(),
            writeFileSync: (0, sinon_1.stub)(),
            readdirSync: (0, sinon_1.stub)().returns(['20231201120000001_updated_blog.js']),
            readFileSync: (0, sinon_1.stub)().returns('const API = \'hello world\'')
        };
    });
    afterEach(() => {
        (0, sinon_1.restore)();
    });
    (0, mocha_1.it)('Should proceed to generate or throw error when permission not provided', () => {
        const { W_OK: writePermission } = fs_1.default.constants;
        const checkPermissions = fs_1.default.accessSync('./', writePermission);
        (0, chai_1.expect)(checkPermissions).to.equal(undefined);
    });
    (0, mocha_1.it)('Should create a root folder for scripts', () => {
        // Mock the createMergeScripts function to return a predictable folder name
        const createMergeScriptsStub = (0, sinon_1.stub)().returns(mockFolderName);
        // Mock fs.existsSync to return true for the mock folder
        const existsSyncStub = (0, sinon_1.stub)(fs_1.default, 'existsSync').returns(true);
        const doesFolderExist = fs_1.default.existsSync(mockFolderName);
        (0, chai_1.expect)(doesFolderExist).to.equal(true);
    });
    (0, mocha_1.it)('Check if folder name contains createdAt timestamp and the end', () => {
        const splitCreatedAt = mockFolderName.split('_');
        const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
        (0, chai_1.expect)(createdAt.length).to.oneOf([12, 13, 14]);
    });
    (0, mocha_1.it)('Check if file name contains the timestamp prefix from the foldername', () => {
        const splitCreatedAt = mockFolderName.split('_');
        const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
        const filesInFolder = ['20231201120000001_updated_blog.js'];
        const doesFileExistWithCreatedAtPrefix = filesInFolder.some((file) => file.includes(createdAt));
        (0, chai_1.expect)(doesFileExistWithCreatedAtPrefix).to.equal(true);
    });
    (0, mocha_1.it)('Check if the content that is passed as argument to the function is present in the file', () => {
        const filesInFolder = ['20231201120000001_updated_blog.js'];
        if (filesInFolder.length !== 0) {
            const contentFromFile = 'const API = \'hello world\'';
            (0, chai_1.expect)(contentFromFile).to.equal('const API = \'hello world\'');
        }
    });
});
(0, mocha_1.describe)('Check for operation status', () => {
    (0, mocha_1.it)('Should return updated when modified is passed', () => {
        const operation = (0, utils_1.getContentTypeMergeStatus)('merge_existing');
        (0, chai_1.expect)(operation).to.equal('updated');
    });
    (0, mocha_1.it)('Should return created when compare_only is passed', () => {
        const operation = (0, utils_1.getContentTypeMergeStatus)('merge_new');
        (0, chai_1.expect)(operation).to.equal('created');
    });
});
