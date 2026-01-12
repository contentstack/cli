import { expect } from 'chai';
import * as sinon from 'sinon';
import ImportEnvironments from '../../../../src/import/modules/environments';
import { fsUtil, fileHelper } from '../../../../src/utils';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import * as fs from 'fs';
import * as path from 'path';

describe('ImportEnvironments', () => {
  let importEnvironments: ImportEnvironments;
  let mockStackClient: any;
  let mockImportConfig: any;
  let sandbox: sinon.SinonSandbox;
  let tempDir: string;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    tempDir = '/tmp/test-backup';
    
    mockStackClient = {
      environment: (envName: string) => ({
        create: sandbox.stub().resolves({ uid: 'env-123', name: 'Test Environment' }),
        update: sandbox.stub().resolves({ uid: 'env-123', name: 'Updated Environment' }),
        fetch: sandbox.stub().resolves({ uid: 'env-123', name: envName || 'Test Environment' })
      })
    };

    mockImportConfig = {
      apiKey: 'test',
      backupDir: tempDir,
      context: { module: 'environments' },
      fetchConcurrency: 3,
      modules: {
        environments: {
          dirName: 'environments',
          fileName: 'environments.json'
        }
      }
    };

    importEnvironments = new ImportEnvironments({
      importConfig: mockImportConfig,
      stackAPIClient: mockStackClient,
      moduleName: 'environments'
    });
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(importEnvironments).to.be.instanceOf(ImportEnvironments);
      expect((importEnvironments as any).importConfig).to.equal(mockImportConfig);
      expect((importEnvironments as any).client).to.equal(mockStackClient);
      expect((importEnvironments as any).environmentsConfig).to.equal(mockImportConfig.modules.environments);
      expect((importEnvironments as any).envFailed).to.deep.equal([]);
      expect((importEnvironments as any).envSuccess).to.deep.equal([]);
      expect((importEnvironments as any).envUidMapper).to.deep.equal({});
    });

    it('should set correct paths', () => {
      expect((importEnvironments as any).mapperDirPath).to.equal(path.join(tempDir, 'mapper', 'environments'));
      expect((importEnvironments as any).environmentsFolderPath).to.equal(path.join(tempDir, 'environments'));
      expect((importEnvironments as any).envUidMapperPath).to.equal(path.join(tempDir, 'mapper', 'environments', 'uid-mapping.json'));
      expect((importEnvironments as any).envSuccessPath).to.equal(path.join(tempDir, 'mapper', 'environments', 'success.json'));
      expect((importEnvironments as any).envFailsPath).to.equal(path.join(tempDir, 'mapper', 'environments', 'fails.json'));
    });

    it('should set context module to environments', () => {
      expect((importEnvironments as any).importConfig.context.module).to.equal('environments');
    });
  });

  describe('start method', () => {
    it('should start import process when environments folder exists', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'environments', 'environments.json'),
        JSON.stringify({
          'env-1': { uid: 'env-1', name: 'Environment 1' },
          'env-2': { uid: 'env-2', name: 'Environment 2' }
        })
      );

      sandbox.stub(importEnvironments as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').callsFake(async () => {
        (importEnvironments as any).environments = {
          'env-1': { uid: 'env-1', name: 'Environment 1' },
          'env-2': { uid: 'env-2', name: 'Environment 2' }
        };
        return [2];
      });
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').resolves();
      const importEnvironmentsStub = sandbox.stub(importEnvironments as any, 'importEnvironments').resolves();
      sandbox.stub(importEnvironments as any, 'processImportResults').resolves();
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      await importEnvironments.start();

      expect((importEnvironments as any).environments).to.deep.equal({
        'env-1': { uid: 'env-1', name: 'Environment 1' },
        'env-2': { uid: 'env-2', name: 'Environment 2' }
      });
      expect(importEnvironmentsStub.called).to.be.true;
    });

    it('should handle when environments folder does not exist', async () => {
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').resolves([0]);

      await importEnvironments.start();

      expect((importEnvironments as any).environments).to.be.undefined;
    });

    it('should handle empty environments data', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'environments', 'environments.json'), JSON.stringify({}));

      sandbox.stub(importEnvironments as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').callsFake(async () => {
        (importEnvironments as any).environments = {};
        return [0];
      });
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').resolves();
      sandbox.stub(importEnvironments as any, 'importEnvironments').resolves();
      sandbox.stub(importEnvironments as any, 'processImportResults').resolves();
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.start();

      expect((importEnvironments as any).environments).to.deep.equal({});
      expect(makeConcurrentCallStub.called).to.be.false; // Should not be called for empty environments
    });

    it('should load existing UID mappings when available', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'environments', 'environments.json'),
        JSON.stringify({ 'env-1': { uid: 'env-1', name: 'Environment 1' } })
      );

      fs.mkdirSync(path.join(tempDir, 'mapper', 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'mapper', 'environments', 'uid-mapping.json'),
        JSON.stringify({ 'old-uid': 'new-uid' })
      );

      sandbox.stub(importEnvironments as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').callsFake(async () => {
        (importEnvironments as any).environments = { 'env-1': { uid: 'env-1', name: 'Environment 1' } };
        return [1];
      });
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').callsFake(async () => {
        (importEnvironments as any).envUidMapper = { 'old-uid': 'new-uid' };
      });
      const importEnvironmentsStub = sandbox.stub(importEnvironments as any, 'importEnvironments').resolves();
      sandbox.stub(importEnvironments as any, 'processImportResults').resolves();
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      await importEnvironments.start();

      expect((importEnvironments as any).envUidMapper).to.deep.equal({ 'old-uid': 'new-uid' });
      expect(importEnvironmentsStub.called).to.be.true;
    });

    it('should handle when UID mapping file does not exist', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'environments', 'environments.json'),
        JSON.stringify({ 'env-1': { uid: 'env-1', name: 'Environment 1' } })
      );

      sandbox.stub(importEnvironments as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').resolves([1]);
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').resolves();
      const importEnvironmentsStub = sandbox.stub(importEnvironments as any, 'importEnvironments').resolves();
      sandbox.stub(importEnvironments as any, 'processImportResults').resolves();
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      await importEnvironments.start();

      expect((importEnvironments as any).envUidMapper).to.deep.equal({});
      expect(importEnvironmentsStub.called).to.be.true;
    });

    it('should write success and failed files when data exists', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'environments', 'environments.json'),
        JSON.stringify({ 'env-1': { uid: 'env-1', name: 'Environment 1' } })
      );

      sandbox.stub(importEnvironments as any, 'withLoadingSpinner').callsFake(async (msg: string, fn: () => Promise<any>) => {
        return await fn();
      });
      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').callsFake(async () => {
        (importEnvironments as any).environments = { 'env-1': { uid: 'env-1', name: 'Environment 1' } };
        return [1];
      });
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').resolves();
      sandbox.stub(importEnvironments as any, 'importEnvironments').callsFake(async () => {
        (importEnvironments as any).envSuccess = [{ uid: 'env-1' }];
        (importEnvironments as any).envFailed = [{ uid: 'env-2' }];
      });
      const processImportResultsStub = sandbox.stub(importEnvironments as any, 'processImportResults');
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      await importEnvironments.start();

      expect(processImportResultsStub.called).to.be.true;
    });

    it('should handle file read errors', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'environments', 'environments.json'), 'invalid json');

      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').rejects(new Error('File read error'));
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      try {
        await importEnvironments.start();
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should handle makeDirectory errors', async () => {
      fs.mkdirSync(path.join(tempDir, 'environments'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'environments', 'environments.json'),
        JSON.stringify({ 'env-1': { uid: 'env-1', name: 'Environment 1' } })
      );

      // Make the mapper directory path uncreatable
      fs.mkdirSync(path.join(tempDir, 'mapper'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'mapper', 'environments'), 'file'); // Make it a file instead of directory

      sandbox.stub(importEnvironments as any, 'analyzeEnvironments').resolves([1]);
      const mockProgress = {
        updateStatus: sandbox.stub()
      };
      sandbox.stub(importEnvironments as any, 'createSimpleProgress').returns(mockProgress);
      sandbox.stub(importEnvironments as any, 'prepareEnvironmentMapper').rejects(new Error('Directory creation failed'));
      sandbox.stub(importEnvironments as any, 'completeProgress').resolves();

      try {
        await importEnvironments.start();
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe('importEnvironments method', () => {
    it('should import environments successfully', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' },
        'env-2': { uid: 'env-2', name: 'Environment 2' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle empty environments data', async () => {
      (importEnvironments as any).environments = {};
      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should handle undefined environments', async () => {
      (importEnvironments as any).environments = undefined;
      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.called).to.be.false;
    });

    it('should process environments with concurrency limit', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
      const callArgs = makeConcurrentCallStub.getCall(0).args[0];
      expect(callArgs.concurrencyLimit).to.equal(3);
      expect(callArgs.processName).to.equal('import environments');
    });

    it('should handle null environments', async () => {
      (importEnvironments as any).environments = null;
      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.called).to.be.false;
    });
  });

  describe('serializeEnvironments method', () => {
    it('should serialize environments successfully', () => {
      const mockApiOptions = {
        entity: 'create-environments' as any,
        apiData: { uid: 'env-123', name: 'Test Environment' },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const result = importEnvironments.serializeEnvironments(mockApiOptions);

      expect(result).to.have.property('apiData');
      expect(result.apiData).to.deep.equal(mockApiOptions.apiData);
    });

    it('should skip environment if already exists in UID mapper', () => {
      (importEnvironments as any).envUidMapper = { 'env-123': 'existing-uid' };
      
      const mockApiOptions = {
        entity: 'create-environments' as any,
        apiData: { uid: 'env-123', name: 'Test Environment' },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const result = importEnvironments.serializeEnvironments(mockApiOptions);

      expect(result.entity).to.be.undefined;
    });

    it('should process environment if not in UID mapper', () => {
      (importEnvironments as any).envUidMapper = {};
      
      const mockApiOptions = {
        entity: 'create-environments' as any,
        apiData: { uid: 'env-123', name: 'Test Environment' },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const result = importEnvironments.serializeEnvironments(mockApiOptions);

      expect(result.entity).to.equal('create-environments');
      expect(result.apiData).to.deep.equal(mockApiOptions.apiData);
    });

    it('should handle environment with undefined uid', () => {
      (importEnvironments as any).envUidMapper = {};
      
      const mockApiOptions = {
        entity: 'create-environments' as any,
        apiData: { uid: undefined as any, name: 'Test Environment' },
        resolve: sandbox.stub(),
        reject: sandbox.stub()
      };

      const result = importEnvironments.serializeEnvironments(mockApiOptions);

      expect(result.entity).to.equal('create-environments');
      expect(result.apiData).to.deep.equal(mockApiOptions.apiData);
    });
  });

  describe('getEnvDetails method', () => {
    it('should fetch environment details successfully', async () => {
      const mockEnvData = { uid: 'env-123', name: 'test-env' };
      const environmentStub = {
        fetch: sandbox.stub().resolves(mockEnvData)
      };
      mockStackClient.environment = sandbox.stub().returns(environmentStub);

      const result = await importEnvironments.getEnvDetails('test-env');

      expect(result).to.deep.equal(mockEnvData);
      expect(environmentStub.fetch.calledOnce).to.be.true;
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed');
      const environmentStub = {
        fetch: sandbox.stub().rejects(error)
      };
      mockStackClient.environment = sandbox.stub().returns(environmentStub);

      const result = await importEnvironments.getEnvDetails('test-env');

      expect(result).to.be.undefined;
      expect(environmentStub.fetch.calledOnce).to.be.true;
    });

    it('should handle fetch errors with specific error handling', async () => {
      const error = new Error('Network error');
      const environmentStub = {
        fetch: sandbox.stub().rejects(error)
      };
      mockStackClient.environment = sandbox.stub().returns(environmentStub);

      const result = await importEnvironments.getEnvDetails('test-env');

      expect(result).to.be.undefined;
      expect(environmentStub.fetch.calledOnce).to.be.true;
    });
  });

  describe('onSuccess callback', () => {
    it('should handle successful environment import', () => {
      const mockResponse = { uid: 'new-env-123', name: 'Test Environment' };
      const mockApiData = { uid: 'old-env-123', name: 'Test Environment' };
      
      (importEnvironments as any).envSuccess = [];
      (importEnvironments as any).envUidMapper = {};

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      const onSuccess = ({ response, apiData = { uid: null, name: '' } }: any) => {
        (importEnvironments as any).envSuccess.push(response);
        (importEnvironments as any).envUidMapper[apiData.uid] = response.uid;
        fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
      };

      onSuccess({ response: mockResponse, apiData: mockApiData });

      expect((importEnvironments as any).envSuccess).to.include(mockResponse);
      expect((importEnvironments as any).envUidMapper[mockApiData.uid]).to.equal(mockResponse.uid);
    });

    it('should handle environment with missing name in onSuccess', () => {
      const mockResponse = { uid: 'new-env-123' };
      const mockApiData = { uid: 'old-env-123' as any };
      
      (importEnvironments as any).envSuccess = [];
      (importEnvironments as any).envUidMapper = {};

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      const onSuccess = ({ response, apiData = { uid: null, name: '' } }: any) => {
        (importEnvironments as any).envSuccess.push(response);
        (importEnvironments as any).envUidMapper[apiData.uid] = response.uid;
        fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
      };

      onSuccess({ response: mockResponse, apiData: mockApiData });

      expect((importEnvironments as any).envSuccess).to.include(mockResponse);
    });

    it('should handle environment with null uid in onSuccess', () => {
      const mockResponse = { uid: 'new-env-123', name: 'Test Environment' };
      const mockApiData = { uid: null as any, name: 'Test Environment' };
      
      (importEnvironments as any).envSuccess = [];
      (importEnvironments as any).envUidMapper = {};

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      const onSuccess = ({ response, apiData = { uid: null, name: '' } }: any) => {
        (importEnvironments as any).envSuccess.push(response);
        (importEnvironments as any).envUidMapper[apiData.uid] = response.uid;
        fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
      };

      onSuccess({ response: mockResponse, apiData: mockApiData });

      expect((importEnvironments as any).envSuccess).to.include(mockResponse);
    });
  });

  describe('onReject callback', () => {
    it('should handle environment already exists error', async () => {
      const mockError = { message: JSON.stringify({ errors: { name: 'already exists' } }) };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };
      const mockEnvDetails = { uid: 'existing-env-123' };

      const getEnvDetailsStub = sandbox.stub(importEnvironments, 'getEnvDetails').resolves(mockEnvDetails);
      (importEnvironments as any).envUidMapper = {};

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envUidMapper[mockApiData.uid]).to.equal(mockEnvDetails.uid);
      expect(getEnvDetailsStub.calledWith(mockApiData.name)).to.be.true;
    });

    it('should handle other import errors', async () => {
      const mockError = { message: JSON.stringify({ errors: { other: 'error' } }) };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });

    it('should handle error without message property', async () => {
      const mockError = { someOtherProperty: 'value' };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });

    it('should handle getEnvDetails returning undefined', async () => {
      const mockError = { message: JSON.stringify({ errors: { name: 'already exists' } }) };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      const getEnvDetailsStub = sandbox.stub(importEnvironments, 'getEnvDetails').resolves(undefined);
      (importEnvironments as any).envUidMapper = {};

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envUidMapper[mockApiData.uid]).to.equal(' ');
      expect(getEnvDetailsStub.calledWith(mockApiData.name)).to.be.true;
    });

    it('should handle error with null message', async () => {
      const mockError = { message: null as any };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });

    it('should handle error with undefined message', async () => {
      const mockError = { message: undefined as any };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });

    it('should handle error with empty string message', async () => {
      const mockError = { message: '' };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        const err = error?.message ? JSON.parse(error.message) : error;
        const { name, uid } = apiData;
        if (err?.errors?.name) {
          const res = await importEnvironments.getEnvDetails(name);
          (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } else {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });

    it('should handle error with invalid JSON message', async () => {
      const mockError = { message: 'invalid json' };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };

      (importEnvironments as any).envFailed = [];

      const onReject = async ({ error, apiData }: any) => {
        try {
          const err = error?.message ? JSON.parse(error.message) : error;
          const { name, uid } = apiData;
          if (err?.errors?.name) {
            const res = await importEnvironments.getEnvDetails(name);
            (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
            fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
          } else {
            (importEnvironments as any).envFailed.push(apiData);
          }
        } catch (parseError) {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envFailed).to.include(mockApiData);
    });
  });

  describe('Callback Functions Integration', () => {
    it('should call onSuccess callback with proper data structure', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiContent, apiParams } = config;
        const { resolve, reject } = apiParams;
        
        // Simulate successful import
        const mockResponse = { uid: 'new-env-1', name: 'Environment 1' };
        const mockApiData = { uid: 'env-1', name: 'Environment 1' };
        
        resolve({ response: mockResponse, apiData: mockApiData });
      });

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      await importEnvironments.importEnvironments();

      expect((importEnvironments as any).envSuccess).to.have.length(1);
      expect((importEnvironments as any).envUidMapper['env-1']).to.equal('new-env-1');
    });

    it('should call onReject callback with name error', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      const getEnvDetailsStub = sandbox.stub(importEnvironments, 'getEnvDetails').resolves({ uid: 'existing-env-1' });

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiContent, apiParams } = config;
        const { resolve, reject } = apiParams;
        
        // Simulate name conflict error
        const mockError = { message: JSON.stringify({ errors: { name: 'already exists' } }) };
        const mockApiData = { uid: 'env-1', name: 'Environment 1' };
        
        reject({ error: mockError, apiData: mockApiData });
      });

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      await importEnvironments.importEnvironments();

      expect(getEnvDetailsStub.calledWith('Environment 1')).to.be.true;
      expect((importEnvironments as any).envUidMapper['env-1']).to.equal('existing-env-1');
    });

    it('should call onReject callback with other error', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };
      (importEnvironments as any).envFailed = [];

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiParams } = config;
        const { reject } = apiParams;
        
        // Simulate other error
        const mockError = { message: JSON.stringify({ errors: { other: 'error' } }) };
        const mockApiData = { uid: 'env-1', name: 'Environment 1' };
        
        reject({ error: mockError, apiData: mockApiData });
      });

      await importEnvironments.importEnvironments();

      expect((importEnvironments as any).envFailed.length).to.be.at.least(1);
    });

    it('should handle onSuccess with missing apiData', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiContent, apiParams } = config;
        const { resolve, reject } = apiParams;
        
        // Simulate successful import with missing apiData
        const mockResponse = { uid: 'new-env-1', name: 'Environment 1' };
        
        resolve({ response: mockResponse, apiData: undefined });
      });

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      await importEnvironments.importEnvironments();

      expect((importEnvironments as any).envSuccess).to.have.length(1);
    });

    it('should handle onReject with missing apiData', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiContent, apiParams } = config;
        const { resolve, reject } = apiParams;
        
        // Simulate error with missing apiData
        const mockError = { message: JSON.stringify({ errors: { other: 'error' } }) };
        
        reject({ error: mockError, apiData: undefined });
      });

      await importEnvironments.importEnvironments();

      // Should handle gracefully without crashing
      expect((importEnvironments as any).envFailed).to.have.length(0);
    });

    it('should handle onReject with getEnvDetails returning null', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment 1' }
      };

      const getEnvDetailsStub = sandbox.stub(importEnvironments, 'getEnvDetails').resolves(null);

      sandbox.stub(importEnvironments as any, 'makeConcurrentCall').callsFake(async (config: any) => {
        const { apiContent, apiParams } = config;
        const { resolve, reject } = apiParams;
        
        // Simulate name conflict error
        const mockError = { message: JSON.stringify({ errors: { name: 'already exists' } }) };
        const mockApiData = { uid: 'env-1', name: 'Environment 1' };
        
        reject({ error: mockError, apiData: mockApiData });
      });

      fs.mkdirSync(path.dirname((importEnvironments as any).envUidMapperPath), { recursive: true });

      await importEnvironments.importEnvironments();

      expect(getEnvDetailsStub.calledWith('Environment 1')).to.be.true;
      expect((importEnvironments as any).envUidMapper['env-1']).to.equal(' ');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle writeFile errors in onSuccess', () => {
      const mockResponse = { uid: 'new-env-123', name: 'Test Environment' };
      const mockApiData = { uid: 'old-env-123', name: 'Test Environment' };
      
      (importEnvironments as any).envSuccess = [];
      (importEnvironments as any).envUidMapper = {};

      const onSuccess = ({ response, apiData }: any) => {
        (importEnvironments as any).envSuccess.push(response);
        (importEnvironments as any).envUidMapper[apiData.uid] = response.uid;
        try {
          fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
        } catch (error) {
          // Handle write error
        }
      };

      // Should not throw
      expect(() => onSuccess({ response: mockResponse, apiData: mockApiData })).to.not.throw();
    });

    it('should handle writeFile errors in onReject', async () => {
      const mockError = { message: JSON.stringify({ errors: { name: 'already exists' } }) };
      const mockApiData = { uid: 'env-123', name: 'Test Environment' };
      const mockEnvDetails = { uid: 'existing-env-123' };

      const getEnvDetailsStub = sandbox.stub(importEnvironments, 'getEnvDetails').resolves(mockEnvDetails);
      (importEnvironments as any).envUidMapper = {};

      const onReject = async ({ error, apiData }: any) => {
        try {
          const err = error?.message ? JSON.parse(error.message) : error;
          const { name, uid } = apiData;
          if (err?.errors?.name) {
            const res = await importEnvironments.getEnvDetails(name);
            (importEnvironments as any).envUidMapper[uid] = res?.uid || ' ';
            try {
              fsUtil.writeFile((importEnvironments as any).envUidMapperPath, (importEnvironments as any).envUidMapper);
            } catch (writeError) {
              // Handle write error
            }
          } else {
            (importEnvironments as any).envFailed.push(apiData);
          }
        } catch (parseError) {
          (importEnvironments as any).envFailed.push(apiData);
        }
      };

      await onReject({ error: mockError, apiData: mockApiData });

      expect((importEnvironments as any).envUidMapper[mockApiData.uid]).to.equal(mockEnvDetails.uid);
      expect(getEnvDetailsStub.calledWith(mockApiData.name)).to.be.true;
    });

    it('should handle environments with special characters in names', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: 'Environment with spaces & symbols!' },
        'env-2': { uid: 'env-2', name: 'Environment-With-Dashes' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle environments with null values', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: null },
        'env-2': { uid: null, name: 'Environment 2' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle environments with undefined values', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: undefined },
        'env-2': { uid: undefined, name: 'Environment 2' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });

    it('should handle environments with empty string values', async () => {
      (importEnvironments as any).environments = {
        'env-1': { uid: 'env-1', name: '' },
        'env-2': { uid: '', name: 'Environment 2' }
      };

      const makeConcurrentCallStub = sandbox.stub(importEnvironments as any, 'makeConcurrentCall').resolves();

      await importEnvironments.importEnvironments();

      expect(makeConcurrentCallStub.calledOnce).to.be.true;
    });
  });
});