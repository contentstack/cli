import { expect } from 'chai';
import sinon from 'sinon';
import { readContentTypeSchemas } from '../../src/content-type-utils';

describe('readContentTypeSchemas', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should return empty array when directory does not exist', () => {
    sinon.stub(require('fs'), 'existsSync').returns(false);

    const result = readContentTypeSchemas('/nonexistent/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);

    sinon.restore();
  });

  it('should read all JSON files and return content types', () => {
    const mockContentTypes = [
      { uid: 'ct-1', title: 'Content Type 1', schema: [] },
      { uid: 'ct-2', title: 'Content Type 2', schema: [] },
    ];

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['ct-1.json', 'ct-2.json', 'schema.json', '.DS_Store']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/ct-1\.json/), 'utf8').returns(JSON.stringify(mockContentTypes[0]));
    readFileStub.withArgs(sinon.match(/ct-2\.json/), 'utf8').returns(JSON.stringify(mockContentTypes[1]));

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(2);
    expect(result[0].uid).to.equal('ct-1');
    expect(result[1].uid).to.equal('ct-2');

    sinon.restore();
  });

  it('should ignore files in ignoredFiles list', () => {
    const mockContentType = { uid: 'ct-1', title: 'Content Type 1', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns([
      'ct-1.json',
      'schema.json',
      '__master.json',
      '__priority.json',
      '.DS_Store',
    ]);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/ct-1\.json/), 'utf8').returns(JSON.stringify(mockContentType));

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(1);
    expect(result[0].uid).to.equal('ct-1');

    sinon.restore();
  });

  it('should skip non-JSON files', () => {
    const mockContentType = { uid: 'ct-1', title: 'Content Type 1', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['ct-1.json', 'readme.txt', 'config.yaml']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/ct-1\.json/), 'utf8').returns(JSON.stringify(mockContentType));

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(1);
    expect(result[0].uid).to.equal('ct-1');

    sinon.restore();
  });

  it('should handle malformed JSON files gracefully', () => {
    const mockContentType = { uid: 'ct-1', title: 'Content Type 1', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['ct-1.json', 'ct-2.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/ct-1\.json/), 'utf8').returns(JSON.stringify(mockContentType));
    readFileStub.withArgs(sinon.match(/ct-2\.json/), 'utf8').returns('invalid json{');

    const consoleWarnStub = sinon.stub(console, 'warn');

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(1);
    expect(result[0].uid).to.equal('ct-1');
    expect(consoleWarnStub.called).to.be.true;

    sinon.restore();
  });

  it('should accept custom ignoredFiles list', () => {
    const mockContentTypes = [
      { uid: 'ct-1', title: 'Content Type 1', schema: [] },
      { uid: 'schema', title: 'Schema Type', schema: [] },
    ];

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['ct-1.json', 'schema.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/ct-1\.json/), 'utf8').returns(JSON.stringify(mockContentTypes[0]));
    readFileStub.withArgs(sinon.match(/schema\.json/), 'utf8').returns(JSON.stringify(mockContentTypes[1]));

    const result = readContentTypeSchemas('/test/path', []);

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(2);

    sinon.restore();
  });

  it('should handle empty directory', () => {
    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns([]);

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);

    sinon.restore();
  });

  it('should handle directory with only ignored files', () => {
    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['schema.json', '.DS_Store', '__master.json']);

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);

    sinon.restore();
  });
});
