"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mocha_1 = require("mocha");
const utils_1 = require("../../../src/utils");
const fs_1 = tslib_1.__importDefault(require("fs"));
const chai_1 = require("chai");
(0, mocha_1.describe)('File system operations', () => {
    const content = `const API = 'hello world'`;
    const folderName = (0, utils_1.createMergeScripts)({ status: 'modified', uid: 'blog' }, content, '1234-1234');
    (0, mocha_1.it)('Should proceed to generate or throw error when permission not provided', () => {
        const { W_OK: writePermission } = fs_1.default.constants;
        const checkPermissions = fs_1.default.accessSync('./', writePermission);
        (0, chai_1.expect)(checkPermissions).to.equal(undefined);
    });
    (0, mocha_1.it)('Should create a root folder for scripts', () => {
        const doesFolderExist = fs_1.default.existsSync(folderName);
        (0, chai_1.expect)(doesFolderExist).to.equal(true);
    });
    (0, mocha_1.it)('Check if folder name contains createdAt timestamp and the end', () => {
        const splitCreatedAt = folderName.split('_');
        const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
        (0, chai_1.expect)(createdAt.length).to.oneOf([12, 13, 14]);
    });
    (0, mocha_1.it)('Check if file name contains the timestamp prefix from the foldername', () => {
        const splitCreatedAt = folderName.split('_');
        const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
        const filesInFolder = fs_1.default.readdirSync(folderName);
        const doesFileExistWithCreatedAtPrefix = filesInFolder.some((file) => file.includes(createdAt));
        (0, chai_1.expect)(doesFileExistWithCreatedAtPrefix).to.equal(true);
    });
    (0, mocha_1.it)('Check if the content that is passed as argument to the function is present in the file', () => {
        const filesInFolder = fs_1.default.readdirSync(folderName);
        if (filesInFolder.length !== 0) {
            const contentFromFile = fs_1.default.readFileSync(`${folderName}/${filesInFolder[0]}`, { encoding: 'utf-8', flag: 'r' });
            (0, chai_1.expect)(contentFromFile).to.equal(content);
        }
    });
});
(0, mocha_1.describe)('Check for operation status', () => {
    (0, mocha_1.it)('Should return updated when modified is passed', () => {
        const operation = (0, utils_1.getContentypeMergeStatus)('modified');
        (0, chai_1.expect)(operation).to.equal('updated');
    });
    (0, mocha_1.it)('Should return created when compare_only is passed', () => {
        const operation = (0, utils_1.getContentypeMergeStatus)('compare_only');
        (0, chai_1.expect)(operation).to.equal('created');
    });
});
