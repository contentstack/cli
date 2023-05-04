import { describe, it } from 'mocha';
import { createMergeScripts, getContentypeMergeStatus } from '../../../src/utils';
import fs from 'fs';
import { expect } from 'chai';

describe('File system operations', () => {
  const content = `const API = 'hello world'`;
  const folderName = createMergeScripts({ status: 'modified', uid: 'blog' }, content, '1234-1234');

  it('Should proceed to generate or throw error when permission not provided', () => {
    const { W_OK: writePermission } = fs.constants;
    const checkPermissions = fs.accessSync('./', writePermission);
    expect(checkPermissions).to.equal(undefined);
  });
  it('Should create a root folder for scripts', () => {
    const doesFolderExist = fs.existsSync(folderName);
    expect(doesFolderExist).to.equal(true);
  });
  it('Check if folder name contains createdAt timestamp and the end', () => {
    const splitCreatedAt = folderName.split('_');
    const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
    expect(createdAt.length).to.oneOf([12, 13, 14]);
  });
  it('Check if file name contains the timestamp prefix from the foldername', () => {
    const splitCreatedAt = folderName.split('_');
    const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
    const filesInFolder = fs.readdirSync(folderName);
    const doesFileExistWithCreatedAtPrefix = filesInFolder.some((file) => file.includes(createdAt));
    expect(doesFileExistWithCreatedAtPrefix).to.equal(true);
  });
  it('Check if the content that is passed as argument to the function is present in the file', () => {
    const filesInFolder = fs.readdirSync(folderName);
    if (filesInFolder.length !== 0) {
      const contentFromFile = fs.readFileSync(`${folderName}/${filesInFolder[0]}`, { encoding: 'utf-8', flag: 'r' });
      expect(contentFromFile).to.equal(content);
    }
  });
});

describe('Check for operation status', () => {
  it('Should return updated when modified is passed', () => {
    const operation = getContentypeMergeStatus('modified');
    expect(operation).to.equal('updated');
  });
  it('Should return created when compare_only is passed', () => {
    const operation = getContentypeMergeStatus('compare_only');
    expect(operation).to.equal('created');
  });
});
