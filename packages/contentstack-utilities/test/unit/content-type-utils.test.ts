import { expect } from 'chai';
import sinon from 'sinon';
import { readContentTypeSchemas, readGlobalFieldSchemas } from '../../src/content-type-utils';

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

  it('should NOT ignore globalfields.json (that is readGlobalFieldSchemas responsibility)', () => {
    const mockBulk = [{ uid: 'gf_1', title: 'GF 1' }];
    const mockPerUid = { uid: 'gf_2', title: 'GF 2', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['globalfields.json', 'gf_2.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/globalfields\.json/), 'utf8').returns(JSON.stringify(mockBulk));
    readFileStub.withArgs(sinon.match(/gf_2\.json/), 'utf8').returns(JSON.stringify(mockPerUid));

    const result = readContentTypeSchemas('/test/path');

    expect(result).to.have.lengthOf(2);

    sinon.restore();
  });
});

describe('readGlobalFieldSchemas', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should return empty array when directory does not exist', () => {
    sinon.stub(require('fs'), 'existsSync').returns(false);

    const result = readGlobalFieldSchemas('/nonexistent/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);
  });

  it('should read per-uid JSON files and ignore globalfields.json by default', () => {
    const mockGF = { uid: 'gf_1', title: 'GF 1', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['gf_1.json', 'globalfields.json', '.DS_Store', 'schema.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/gf_1\.json/), 'utf8').returns(JSON.stringify(mockGF));

    const result = readGlobalFieldSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(1);
    expect(result[0].uid).to.equal('gf_1');
  });

  it('should not include globalfields.json — prevents bulk-array corruption on import', () => {
    const mockBulkArray = [{ uid: 'gf_1' }, { uid: 'gf_2' }];
    const mockPerUid = { uid: 'gf_3', title: 'GF 3', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['globalfields.json', 'gf_3.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/globalfields\.json/), 'utf8').returns(JSON.stringify(mockBulkArray));
    readFileStub.withArgs(sinon.match(/gf_3\.json/), 'utf8').returns(JSON.stringify(mockPerUid));

    const result = readGlobalFieldSchemas('/test/path');

    // Only the per-uid file is returned; globalfields.json array not parsed as a schema entry
    expect(result).to.have.lengthOf(1);
    expect(Array.isArray(result[0])).to.be.false;
    expect((result[0] as any).uid).to.equal('gf_3');
  });

  it('should read multiple per-uid files', () => {
    const mockGF1 = { uid: 'gf_1', title: 'GF 1', schema: [] };
    const mockGF2 = { uid: 'gf_2', title: 'GF 2', schema: [] };

    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['gf_1.json', 'gf_2.json', 'globalfields.json']);
    const readFileStub = sinon.stub(require('fs'), 'readFileSync');
    readFileStub.withArgs(sinon.match(/gf_1\.json/), 'utf8').returns(JSON.stringify(mockGF1));
    readFileStub.withArgs(sinon.match(/gf_2\.json/), 'utf8').returns(JSON.stringify(mockGF2));

    const result = readGlobalFieldSchemas('/test/path');

    expect(result).to.have.lengthOf(2);
    expect(result.map((r: any) => r.uid)).to.include.members(['gf_1', 'gf_2']);
  });

  it('should return empty array when directory contains only globalfields.json', () => {
    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['globalfields.json', '.DS_Store']);

    const result = readGlobalFieldSchemas('/test/path');

    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);
  });

  it('readContentTypeSchemas default ignore list is unchanged — no globalfields.json exclusion', () => {
    sinon.stub(require('fs'), 'existsSync').returns(true);
    sinon.stub(require('fs'), 'readdirSync').returns(['globalfields.json']);
    sinon.stub(require('fs'), 'readFileSync')
      .withArgs(sinon.match(/globalfields\.json/), 'utf8')
      .returns(JSON.stringify([{ uid: 'gf_1' }]));

    // readContentTypeSchemas includes globalfields.json; readGlobalFieldSchemas excludes it
    const ctResult = readContentTypeSchemas('/test/path');
    const gfResult = readGlobalFieldSchemas('/test/path');

    expect(ctResult).to.have.lengthOf(1);
    expect(gfResult).to.have.lengthOf(0);
  });
});
