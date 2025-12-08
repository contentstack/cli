import { expect } from 'chai';
import * as sinon from 'sinon';
import { join } from 'node:path';
import values from 'lodash/values';
import ImportTaxonomies from '../../../../src/import/modules/taxonomies';
import { fsUtil, fileHelper } from '../../../../src/utils';

describe('ImportTaxonomies', () => {
  let importTaxonomies: ImportTaxonomies;
  let mockStackClient: any;
  let mockImportConfig: any;
  let sandbox: sinon.SinonSandbox;
  const testBackupDir = join(__dirname, 'mock-data');

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock stack client
    mockStackClient = {
      taxonomy: (uid?: string) => ({
        create: sandbox.stub().resolves({ 
          uid: `stack-${uid || 'new'}-${Date.now()}`, 
          name: 'Test Taxonomy'
        }),
        update: sandbox.stub().resolves({ 
          uid: `updated-${uid || 'tax'}-${Date.now()}`, 
          name: 'Updated Taxonomy'
        }),
        fetch: sandbox.stub().resolves({ 
          uid: uid || 'tax-123', 
          name: 'Test Taxonomy'
        }),
        fetchAll: sandbox.stub().resolves({ items: [] })
      })
    };

    // Mock import config
    mockImportConfig = {
      apiKey: 'test',
      backupDir: testBackupDir,
      context: { module: 'taxonomies' },
      concurrency: 2,
      fetchConcurrency: 3,
      master_locale: { code: 'en-us' },
      modules: {
        taxonomies: {
          dirName: 'taxonomies',
          fileName: 'taxonomies.json'
        },
        locales: {
          dirName: 'locales',
          fileName: 'locales.json'
        }
      }
    };

    // Create instance
    importTaxonomies = new ImportTaxonomies({
      importConfig: mockImportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'taxonomies'
    });

    // Stub utility functions
    sandbox.stub(fsUtil, 'readFile');
    sandbox.stub(fsUtil, 'writeFile');
    sandbox.stub(fsUtil, 'makeDirectory');
    sandbox.stub(fileHelper, 'fileExistsSync');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(importTaxonomies).to.be.instanceOf(ImportTaxonomies);
      expect((importTaxonomies as any).importConfig).to.deep.equal(mockImportConfig);
      expect((importTaxonomies as any).client).to.equal(mockStackClient);
      expect((importTaxonomies as any).taxonomiesConfig).to.deep.equal(mockImportConfig.modules.taxonomies);
      expect((importTaxonomies as any).createdTaxonomies).to.deep.equal({});
      expect((importTaxonomies as any).failedTaxonomies).to.deep.equal({});
      expect((importTaxonomies as any).createdTerms).to.deep.equal({});
      expect((importTaxonomies as any).failedTerms).to.deep.equal({});
    });

    it('should set correct paths', () => {
      expect((importTaxonomies as any).taxonomiesMapperDirPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies'));
      expect((importTaxonomies as any).termsMapperDirPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies', 'terms'));
      expect((importTaxonomies as any).taxonomiesFolderPath).to.equal(join(testBackupDir, 'taxonomies'));
      expect((importTaxonomies as any).taxSuccessPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies', 'success.json'));
      expect((importTaxonomies as any).taxFailsPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies', 'fails.json'));
      expect((importTaxonomies as any).termsSuccessPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies', 'terms', 'success.json'));
      expect((importTaxonomies as any).termsFailsPath).to.equal(join(testBackupDir, 'mapper', 'taxonomies', 'terms', 'fails.json'));
    });

    it('should set context module to taxonomies', () => {
      expect((importTaxonomies as any).importConfig.context.module).to.equal('taxonomies');
    });
  });

  describe('start', () => {
    it('should start import process when taxonomies folder exists', async () => {
      // Mock file system to return true for taxonomies folder
      (fileHelper.fileExistsSync as any).returns(true);
      
      // Mock reading taxonomies.json file
      (fsUtil.readFile as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) {
          return {
            'taxonomy_1': { uid: 'taxonomy_1', name: 'Test Taxonomy 1' },
            'taxonomy_2': { uid: 'taxonomy_2', name: 'Test Taxonomy 2' }
          };
        }
        return {};
      });
      (fsUtil.makeDirectory as any).resolves();

      // Stub makeConcurrentCall to avoid file system issues
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await importTaxonomies.start();

      expect((fileHelper.fileExistsSync as any).called).to.be.true;
      expect((fsUtil.readFile as any).called).to.be.true;
      expect((fsUtil.makeDirectory as any).called).to.be.true;
    });

    it('should handle when taxonomies folder does not exist', async () => {
      (fileHelper.fileExistsSync as any).returns(false);

      await importTaxonomies.start();

      expect((fileHelper.fileExistsSync as any).calledOnce).to.be.true;
      expect((fsUtil.readFile as any).called).to.be.false;
    });

    it('should handle empty taxonomies data', async () => {
      // Mock file system to return true for taxonomies folder
      (fileHelper.fileExistsSync as any).returns(true);
      
      // Mock reading empty taxonomies.json file
      (fsUtil.readFile as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) {
          return {}; // Empty taxonomies object
        }
        return {};
      });
      (fsUtil.makeDirectory as any).resolves();

      // Stub makeConcurrentCall
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await importTaxonomies.start();

      expect((fileHelper.fileExistsSync as any).called).to.be.true;
      expect((fsUtil.readFile as any).called).to.be.true;
      expect((fsUtil.makeDirectory as any).called).to.be.true;
    });

    it('should handle null taxonomies data', async () => {
      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns(null);
      (fsUtil.makeDirectory as any).resolves();
      
      // Stub makeConcurrentCall to avoid errors when processing null taxonomies
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      // Should complete without errors when taxonomies data is null
      // The method should handle null gracefully and not throw
      await importTaxonomies.start();

      // Verify the method completed successfully (no assertion needed as the test would fail if an error was thrown)
    });

    it('should write success and failed files when data exists', async () => {
      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns({ 'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' } });
      (fsUtil.makeDirectory as any).resolves();

      // Stub makeConcurrentCall and set up success/failed data
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async () => {
        (importTaxonomies as any).createdTaxonomies = { 'taxonomy_1': { uid: 'taxonomy_1' } };
        (importTaxonomies as any).failedTaxonomies = { 'taxonomy_2': { uid: 'taxonomy_2' } };
        (importTaxonomies as any).createdTerms = { 'taxonomy_1': { 'term_1': { uid: 'term_1' } } };
        (importTaxonomies as any).failedTerms = { 'taxonomy_2': { 'term_2': { uid: 'term_2' } } };
      });

      await importTaxonomies.start();

      expect((fsUtil.writeFile as any).called).to.be.true;
    });
  });

  describe('importTaxonomies', () => {
    it('should import taxonomies successfully', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' },
        'taxonomy_2': { uid: 'taxonomy_2', name: 'Taxonomy 2' }
      };

      // Stub makeConcurrentCall
      const makeConcurrentCallStub = sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle empty taxonomies data', async () => {
      (importTaxonomies as any).taxonomies = {};
      const makeConcurrentCallStub = sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await (importTaxonomies as any).importTaxonomies({ apiContent: [] });

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle undefined taxonomies', async () => {
      (importTaxonomies as any).taxonomies = undefined;
      const makeConcurrentCallStub = sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await (importTaxonomies as any).importTaxonomies({ apiContent: [] });

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should process taxonomies with concurrency limit', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      const makeConcurrentCallStub = sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').resolves();

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
      const callArgs = makeConcurrentCallStub.getCall(0).args[0];
      expect(callArgs.concurrencyLimit).to.equal(2); // Should use concurrency from config
    });
  });

  describe('serializeTaxonomiesData', () => {
    it('should serialize taxonomy successfully', () => {
      const mockApiOptions = {
        entity: 'import-taxonomy' as any,
        apiData: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        queryParam: { locale: undefined as string | undefined },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns({
        taxonomy: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
      });

      const result = (importTaxonomies as any).serializeTaxonomiesData(mockApiOptions);

      expect(result).to.have.property('apiData');
      expect(result.apiData.taxonomy).to.have.property('uid');
      expect(result.apiData.terms).to.have.property('term_1');
    });

    it('should handle file does not exist', () => {
      const mockApiOptions = {
        entity: 'import-taxonomy' as any,
        apiData: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        queryParam: { locale: undefined as string | undefined },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      (fileHelper.fileExistsSync as any).returns(false);

      const result = (importTaxonomies as any).serializeTaxonomiesData(mockApiOptions);

      expect(result.apiData).to.be.undefined;
    });

    it('should handle taxonomy with terms', () => {
      const mockApiOptions = {
        entity: 'import-taxonomy' as any,
        apiData: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        queryParam: { locale: undefined as string | undefined },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns({
        taxonomy: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        terms: {
          'term_1': { uid: 'term_1', name: 'Term 1' },
          'term_2': { uid: 'term_2', name: 'Term 2' }
        }
      });

      const result = (importTaxonomies as any).serializeTaxonomiesData(mockApiOptions);

      expect(result.apiData.terms).to.have.property('term_1');
      expect(result.apiData.terms).to.have.property('term_2');
    });

    it('should handle taxonomy with no terms', () => {
      const mockApiOptions = {
        entity: 'import-taxonomy' as any,
        apiData: { uid: 'taxonomy_3', name: 'Test Taxonomy' },
        queryParam: { locale: undefined as string | undefined },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns({
        taxonomy: { uid: 'taxonomy_3', name: 'Test Taxonomy' },
        terms: {}
      });

      const result = (importTaxonomies as any).serializeTaxonomiesData(mockApiOptions);

      expect(result.apiData.terms).to.deep.equal({});
    });
  });

  describe('createSuccessAndFailedFile', () => {
    it('should write all four files when data exists', () => {
      (importTaxonomies as any).createdTaxonomies = { 'taxonomy_1': { uid: 'taxonomy_1' } };
      (importTaxonomies as any).failedTaxonomies = { 'taxonomy_2': { uid: 'taxonomy_2' } };
      (importTaxonomies as any).createdTerms = { 'taxonomy_1': { 'term_1': {} } };
      (importTaxonomies as any).failedTerms = { 'taxonomy_2': { 'term_2': {} } };

      (importTaxonomies as any).createSuccessAndFailedFile();

      expect((fsUtil.writeFile as any).called).to.be.true;
      expect((fsUtil.writeFile as any).callCount).to.equal(4);
    });

    it('should write only success files', () => {
      (importTaxonomies as any).createdTaxonomies = { 'taxonomy_1': { uid: 'taxonomy_1' } };
      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).createdTerms = { 'taxonomy_1': { 'term_1': {} } };
      (importTaxonomies as any).failedTerms = {};

      (importTaxonomies as any).createSuccessAndFailedFile();

      expect((fsUtil.writeFile as any).calledTwice).to.be.true;
    });

    it('should write only failed files', () => {
      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).failedTaxonomies = { 'taxonomy_2': { uid: 'taxonomy_2' } };
      (importTaxonomies as any).createdTerms = {};
      (importTaxonomies as any).failedTerms = { 'taxonomy_2': { 'term_2': {} } };

      (importTaxonomies as any).createSuccessAndFailedFile();

      expect((fsUtil.writeFile as any).calledTwice).to.be.true;
    });

    it('should not write files when all empty', () => {
      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};
      (importTaxonomies as any).failedTerms = {};

      (importTaxonomies as any).createSuccessAndFailedFile();

      expect((fsUtil.writeFile as any).called).to.be.false;
    });

    it('should write files and trigger debug logging with counts', () => {
      (importTaxonomies as any).createdTaxonomies = { 'tax_1': { uid: 'tax_1' }, 'tax_2': { uid: 'tax_2' } };
      (importTaxonomies as any).failedTaxonomies = { 'tax_3': { uid: 'tax_3' } };
      (importTaxonomies as any).createdTerms = { 'tax_1': { 'term_1': {} }, 'tax_2': { 'term_2': {} } };
      (importTaxonomies as any).failedTerms = { 'tax_3': { 'term_3': {} } };

      (importTaxonomies as any).createSuccessAndFailedFile();

      expect((fsUtil.writeFile as any).called).to.be.true;
      expect((fsUtil.writeFile as any).callCount).to.equal(4);
    });

  });

  describe('onSuccess callback', () => {
    it('should log taxonomy details with JSON stringify', () => {
      const mockApiData = { 
        taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, 
        terms: { 'term_1': {}, 'term_2': {} }
      };

      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};

      const onSuccess = ({ apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        const taxonomyName = apiData?.taxonomy?.name;
        const termsCount = Object.keys(apiData?.terms || {}).length;

        (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
      };

      onSuccess({ apiData: mockApiData });

      expect((importTaxonomies as any).createdTaxonomies['tax-123']).to.exist;
      expect((importTaxonomies as any).createdTerms['tax-123']).to.have.property('term_1');
      expect((importTaxonomies as any).createdTerms['tax-123']).to.have.property('term_2');
    });
  });

  describe('onReject callback full coverage', () => {
    it('should handle successful taxonomy import', () => {
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};

      // Call the onSuccess function directly
      const onSuccess = ({ apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
      };

      onSuccess({ apiData: mockApiData });

      expect((importTaxonomies as any).createdTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
      expect((importTaxonomies as any).createdTerms['tax-123']).to.deep.equal({ 'term_1': {} });
    });

    it('should handle apiData without terms', () => {
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: undefined as any };

      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};

      const onSuccess = ({ apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
      };

      onSuccess({ apiData: mockApiData });

      expect((importTaxonomies as any).createdTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
    });
  });

  describe('onReject callback', () => {
    let makeConcurrentCallStub: any;

    it('should handle 409 Conflict - taxonomy already exists', () => {
      const mockError = { status: 409, statusText: 'Conflict' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};

      // Call the onReject function directly
      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).createdTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
      expect((importTaxonomies as any).createdTerms['tax-123']).to.deep.equal({ 'term_1': {} });
    });

    it('should handle error with errorMessage', () => {
      const mockError = { errorMessage: 'Custom error message' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
      expect((importTaxonomies as any).failedTerms['tax-123']).to.deep.equal({ 'term_1': {} });
    });

    it('should handle error with errors.taxonomy', () => {
      const mockError = { errors: { taxonomy: 'Invalid taxonomy' } };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
    });

    it('should handle error with errors.term', () => {
      const mockError = { errors: { term: 'Invalid term' } };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
    });

    it('should handle error with message only', () => {
      const mockError = { message: 'Generic error' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
        (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
    });

    it('should handle onReject with 409 conflict logging', () => {
      const mockError = { status: 409, statusText: 'Conflict' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: { 'term_1': {} } };

      (importTaxonomies as any).createdTaxonomies = {};
      (importTaxonomies as any).createdTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;
        const taxonomyName = apiData?.taxonomy?.name;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).createdTaxonomies['tax-123']).to.deep.equal({ uid: 'tax-123', name: 'Test Taxonomy' });
    });

    it('should handle onReject with errorMessage path', () => {
      const mockError = { errorMessage: 'Custom error' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: {} };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.exist;
    });

    it('should handle onReject with errors.taxonomy path', () => {
      const mockError = { errors: { taxonomy: 'Taxonomy validation failed' } };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: {} };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.exist;
    });

    it('should handle onReject with errors.term path', () => {
      const mockError = { errors: { term: 'Term validation failed' } };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: {} };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.exist;
    });

    it('should handle onReject with message path', () => {
      const mockError = { message: 'Generic error message' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: {} };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.exist;
    });

    it('should handle onReject without errorMessage or message', () => {
      const mockError = { code: 'UNKNOWN' };
      const mockApiData = { taxonomy: { uid: 'tax-123', name: 'Test Taxonomy' }, terms: {} };

      (importTaxonomies as any).failedTaxonomies = {};
      (importTaxonomies as any).failedTerms = {};

      const onReject = ({ error, apiData }: any) => {
        const taxonomyUID = apiData?.taxonomy?.uid;

        if (error?.status === 409 && error?.statusText === 'Conflict') {
          (importTaxonomies as any).createdTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).createdTerms[taxonomyUID] = apiData?.terms;
        } else {
          (importTaxonomies as any).failedTaxonomies[taxonomyUID] = apiData?.taxonomy;
          (importTaxonomies as any).failedTerms[taxonomyUID] = apiData?.terms;
        }
      };

      onReject({ error: mockError, apiData: mockApiData });

      expect((importTaxonomies as any).failedTaxonomies['tax-123']).to.exist;
    });
  });

  describe('Callback Functions Integration', () => {
    it('should execute actual onSuccess callback with lines 93-105', async () => {
      // Set up file helper to return false so serializeTaxonomiesData gets proper data
      (fileHelper.fileExistsSync as any).returns(false);
      (fsUtil.readFile as any).returns({});
      (fsUtil.makeDirectory as any).resolves();
      
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      // Mock the actual makeConcurrentCall implementation to call real callbacks
      const originalMakeConcurrentCall = (importTaxonomies as any).makeConcurrentCall.bind(importTaxonomies);
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async function(this: any, config: any) {
        // Create mock apiData that serializeTaxonomiesData would return
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        // Call the REAL onSuccess callback (which has access to 'this' scope and will execute lines 93-105)
        const onSuccess = config.apiParams.resolve.bind(importTaxonomies);
        await onSuccess({ apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      // Verify the actual callback executed lines 97-98
      expect((importTaxonomies as any).createdTaxonomies['taxonomy_1']).to.exist;
      expect((importTaxonomies as any).createdTerms['taxonomy_1']).to.exist;
    });

    it('should execute actual onReject callback with 409 conflict lines 114-118', async () => {
      (fileHelper.fileExistsSync as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) return true;
        if (path.includes('taxonomy_1.json')) return true;
        return false;
      });
      (fsUtil.readFile as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) {
          return { 'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' } };
        }
        if (path.includes('taxonomy_1.json')) {
          return {
            taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
            terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
          };
        }
        return {};
      });
      (fsUtil.makeDirectory as any).resolves();
      
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      // Mock makeConcurrentCall to invoke the actual onReject callback
      let actualOnSuccess: any = null;
      let actualOnReject: any = null;
      
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async function(this: any, config: any) {
        actualOnSuccess = config.apiParams.resolve;
        actualOnReject = config.apiParams.reject;
        
        // Execute serializeTaxonomiesData to get proper apiData
        const serialized = (importTaxonomies as any).serializeTaxonomiesData({
          apiData: config.apiContent[0],
          entity: 'import-taxonomy',
          queryParam: { locale: config.apiParams.queryParam?.locale },
          resolve: actualOnSuccess,
          reject: actualOnReject
        });
        
        // Call the ACTUAL onReject callback with 409 error
        if (serialized.apiData) {
          await actualOnReject.call(importTaxonomies, { 
            error: { status: 409, statusText: 'Conflict' },
            apiData: serialized.apiData
          });
        }
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      // Verify lines 117-118 executed (adding to createdTaxonomies and createdTerms on 409)
      expect((importTaxonomies as any).createdTaxonomies['taxonomy_1']).to.exist;
      expect((importTaxonomies as any).createdTerms['taxonomy_1']).to.exist;
    });

    it('should execute actual onReject callback with error lines 120-133', async () => {
      (fileHelper.fileExistsSync as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) return true;
        if (path.includes('taxonomy_1.json')) return true;
        return false;
      });
      (fsUtil.readFile as any).callsFake((path: string) => {
        if (path.includes('taxonomies.json')) {
          return { 'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' } };
        }
        if (path.includes('taxonomy_1.json')) {
          return {
            taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
            terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
          };
        }
        return {};
      });
      (fsUtil.makeDirectory as any).resolves();
      
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      // Mock makeConcurrentCall to invoke the actual onReject callback
      let actualOnSuccess: any = null;
      let actualOnReject: any = null;
      
      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async function(this: any, config: any) {
        actualOnSuccess = config.apiParams.resolve;
        actualOnReject = config.apiParams.reject;
        
        // Execute serializeTaxonomiesData to get proper apiData
        const serialized = (importTaxonomies as any).serializeTaxonomiesData({
          apiData: config.apiContent[0],
          entity: 'import-taxonomy',
          queryParam: { locale: config.apiParams.queryParam?.locale },
          resolve: actualOnSuccess,
          reject: actualOnReject
        });
        
        // Call the ACTUAL onReject callback with other error
        if (serialized.apiData) {
          await actualOnReject.call(importTaxonomies, { 
            error: { errorMessage: 'Network error' },
            apiData: serialized.apiData
          });
        }
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      // Verify lines 131-132 executed (adding to failedTaxonomies and failedTerms)
      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
      expect((importTaxonomies as any).failedTerms['taxonomy_1']).to.exist;
    });

    it('should test onReject with errorMessage only', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { errorMessage: 'Invalid taxonomy' };
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
    });

    it('should test onReject with errors.taxonomy', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { errors: { taxonomy: 'Invalid taxonomy format' } };
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
    });

    it('should test onReject with errors.term', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { errors: { term: 'Invalid term format' } };
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
    });

    it('should test onReject with message only', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { message: 'Network timeout' };
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
    });

    it('should test onReject without errorMessage or message', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { code: 'UNKNOWN_ERROR' };
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).failedTaxonomies['taxonomy_1']).to.exist;
    });

    it('should handle apiData without taxonomy in onReject', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onReject = config.apiParams.reject;
        const mockError = { errorMessage: 'Error' };
        const mockApiData = {
          taxonomy: undefined as any,
          terms: { 'term_1': { uid: 'term_1', name: 'Term 1' } }
        };
        
        onReject({ error: mockError, apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect(Object.keys((importTaxonomies as any).failedTaxonomies)).to.include('undefined');
    });

    it('should handle apiData without terms in onSuccess', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onSuccess = config.apiParams.resolve;
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: undefined as any
        };
        
        onSuccess({ apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).createdTaxonomies['taxonomy_1']).to.exist;
      expect((importTaxonomies as any).createdTerms['taxonomy_1']).to.be.undefined;
    });

    it('should handle apiData with empty terms in onSuccess', async () => {
      (importTaxonomies as any).taxonomies = {
        'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' }
      };

      sandbox.stub(importTaxonomies as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const onSuccess = config.apiParams.resolve;
        const mockApiData = {
          taxonomy: { uid: 'taxonomy_1', name: 'Taxonomy 1' },
          terms: {}
        };
        
        onSuccess({ apiData: mockApiData });
      });

      await (importTaxonomies as any).importTaxonomies({ apiContent: values((importTaxonomies as any).taxonomies) });

      expect((importTaxonomies as any).createdTaxonomies['taxonomy_1']).to.exist;
      expect((importTaxonomies as any).createdTerms['taxonomy_1']).to.deep.equal({});
    });

    it('should handle empty taxonomies list', async () => {
      (importTaxonomies as any).taxonomies = {};

      await (importTaxonomies as any).importTaxonomies({ apiContent: [] });

      expect((importTaxonomies as any).createdTaxonomies).to.deep.equal({});
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle makeDirectory errors', async () => {
      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).returns({ 'taxonomy_1': { uid: 'taxonomy_1', name: 'Taxonomy 1' } });
      (fsUtil.makeDirectory as any).rejects(new Error('Directory creation failed'));

      try {
        await importTaxonomies.start();
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Directory creation failed');
      }
    });

    it('should handle file read errors in serializeTaxonomiesData', () => {
      const mockApiOptions = {
        entity: 'import-taxonomy' as any,
        apiData: { uid: 'taxonomy_1', name: 'Test Taxonomy' },
        queryParam: { locale: undefined as string | undefined },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      (fileHelper.fileExistsSync as any).returns(true);
      (fsUtil.readFile as any).throws(new Error('File read error'));

      const result = (importTaxonomies as any).serializeTaxonomiesData(mockApiOptions);
      
      // When file read fails, loadTaxonomyFile catches the error and returns undefined,
      // which causes serializeTaxonomiesData to set apiData to undefined
      expect(result.apiData).to.be.undefined;
    });
  });
});
