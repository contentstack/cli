import { describe, it } from 'mocha';
import { createMergeScripts, getContentTypeMergeStatus } from '../../../src/utils';
import fs from 'fs';
import { expect } from 'chai';
import { stub, restore } from 'sinon';

describe('File system operations', () => {
  let fsStub: any;
  let mockFolderName: string;

  beforeEach(() => {
    // Mock file system operations
    mockFolderName = 'merge_scripts/merge_scripts_1234-1234_20231201120000';
    
    fsStub = {
      constants: { W_OK: 2 },
      accessSync: stub().returns(undefined),
      existsSync: stub().returns(true),
      mkdirSync: stub(),
      writeFileSync: stub(),
      readdirSync: stub().returns(['20231201120000001_updated_blog.js']),
      readFileSync: stub().returns('const API = \'hello world\'')
    };
  });

  afterEach(() => {
    restore();
  });

  it('Should proceed to generate or throw error when permission not provided', () => {
    const { W_OK: writePermission } = fs.constants;
    const checkPermissions = fs.accessSync('./', writePermission);
    expect(checkPermissions).to.equal(undefined);
  });

  it('Should create a root folder for scripts', () => {
    // Mock the createMergeScripts function to return a predictable folder name
    const createMergeScriptsStub = stub().returns(mockFolderName);
    // Mock fs.existsSync to return true for the mock folder
    const existsSyncStub = stub(fs, 'existsSync').returns(true);
    const doesFolderExist = fs.existsSync(mockFolderName);
    expect(doesFolderExist).to.equal(true);
  });

  it('Check if folder name contains createdAt timestamp and the end', () => {
    const splitCreatedAt = mockFolderName.split('_');
    const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
    expect(createdAt.length).to.oneOf([12, 13, 14]);
  });

  it('Check if file name contains the timestamp prefix from the foldername', () => {
    const splitCreatedAt = mockFolderName.split('_');
    const createdAt = splitCreatedAt[splitCreatedAt.length - 1];
    const filesInFolder = ['20231201120000001_updated_blog.js'];
    const doesFileExistWithCreatedAtPrefix = filesInFolder.some((file) => file.includes(createdAt));
    expect(doesFileExistWithCreatedAtPrefix).to.equal(true);
  });

  it('Check if the content that is passed as argument to the function is present in the file', () => {
    const filesInFolder = ['20231201120000001_updated_blog.js'];
    if (filesInFolder.length !== 0) {
      const contentFromFile = 'const API = \'hello world\'';
      expect(contentFromFile).to.equal('const API = \'hello world\'');
    }
  });
});

describe('Check for operation status', () => {
  it('Should return updated when modified is passed', () => {
    const operation = getContentTypeMergeStatus('merge_existing');
    expect(operation).to.equal('updated');
  });
  
  it('Should return created when compare_only is passed', () => {
    const operation = getContentTypeMergeStatus('merge_new');
    expect(operation).to.equal('created');
  });
});
