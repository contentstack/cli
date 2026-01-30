import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import ContentTypeService from '../../../src/services/content-types';
import * as mapModule from '../../../src/utils/map';
import * as utilsModule from '../../../src/utils';
import Base from '../../../src/modules/base';

describe('Content Types Service', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let service: ContentTypeService;
  let getStub: SinonStub;
  let getMapInstanceStub: SinonStub;
  let getDataWithActionStub: SinonStub;
  let safePromiseStub: SinonStub;
  let successHandlerStub: SinonStub;
  let errorHelperStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockStackSDK: any;
  let mockBase: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    mockStackSDK = {
      contentType: sandbox.stub().returns({
        fetch: sandbox.stub().resolves({ content_type: { uid: 'test-id', title: 'Test' } }),
        create: sandbox.stub().resolves({ content_type: { uid: 'test-id', title: 'Test' } }),
        delete: sandbox.stub().resolves({ content_type: { uid: 'test-id' } }),
      }),
    };
    mockBase = {
      dispatch: sandbox.stub(),
    };

    getMapInstanceStub = sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    // Set up the map instance with MANAGEMENT_SDK
    mockMapInstance.set('MANAGEMENT_SDK', mockStackSDK);
    
    getStub = sandbox.stub(mapModule, 'get').callsFake((key: string, mapInst: Map<string, any>, data?: any) => {
      const existing = mapInst.get(key);
      if (existing !== undefined) {
        return existing;
      }
      if (key === 'MANAGEMENT_SDK') {
        mapInst.set(key, mockStackSDK);
        return mockStackSDK;
      }
      // If not found, set default and return it (matching real get behavior)
      const defaultValue = data !== undefined ? data : {};
      mapInst.set(key, defaultValue);
      return defaultValue;
    });
    getDataWithActionStub = sandbox.stub(mapModule, 'getDataWithAction').returns({
      content_type: { uid: 'test-id', title: 'Test' },
    });
    safePromiseStub = sandbox.stub(utilsModule, 'safePromise').callsFake(async (promise: any) => {
      try {
        const result = await promise;
        return [null, result];
      } catch (err) {
        return [err, null];
      }
    });
    successHandlerStub = sandbox.stub(utilsModule, 'successHandler');
    errorHelperStub = sandbox.stub(utilsModule, 'errorHelper');

    service = new ContentTypeService();
    (service as any).base = mockBase;
    // Override stackSDKInstance with mocked version since it's set in constructor
    (service as any).stackSDKInstance = mockStackSDK;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should export ContentTypeService class', () => {
    expect(ContentTypeService).to.exist;
  });

  it('should be instantiable', () => {
    expect(service).to.be.instanceOf(ContentTypeService);
    expect(service.moveFieldActions).to.be.an('array');
    expect(service.moveFieldActions).to.have.length(0);
  });

  describe('fetchContentType', () => {
    it('should fetch content type successfully', async () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const result = await service.fetchContentType(callsite, 'test-id');

      expect(result).to.have.property('content_type');
      expect(successHandlerStub.called).to.be.true;
      expect(mockStackSDK.contentType.calledWith('test-id')).to.be.true;
    });

    it('should handle errors when fetching content type', async () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const error = new Error('Fetch failed');
      safePromiseStub.callsFake(async () => [error, null]);

      try {
        await service.fetchContentType(callsite, 'test-id');
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(errorHelperStub.called).to.be.true;
        expect(mockBase.dispatch.called).to.be.true;
      }
    });
  });

  describe('postContentTypes', () => {

    it('should handle errors when creating content type', async () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const error = new Error('Create failed');
      safePromiseStub.callsFake(async () => [error, null]);

      try {
        await service.postContentTypes(callsite, 'test-id', 'CREATE_CT');
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(errorHelperStub.called).to.be.true;
        expect(mockBase.dispatch.called).to.be.true;
      }
    });
  });

  describe('editContentType', () => {
  });

  describe('deleteContentType', () => {
    it('should delete content type successfully', async () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      service.setIdAndAction('test-id', 'DELETE_CT');
      // Ensure stackSDKInstance is properly mocked
      (service as any).stackSDKInstance = mockStackSDK;

      const result = await service.deleteContentType(callsite);

      expect(result).to.have.property('uid');
      expect(successHandlerStub.called).to.be.true;
      expect(mockStackSDK.contentType.calledWith('test-id')).to.be.true;
    });

    it('should handle errors when deleting content type', async () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const error = new Error('Delete failed');
      service.setIdAndAction('test-id', 'DELETE_CT');
      safePromiseStub.callsFake(async () => [error, null]);

      try {
        await service.deleteContentType(callsite);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
        expect(errorHelperStub.called).to.be.true;
        expect(mockBase.dispatch.called).to.be.true;
      }
    });
  });

  describe('setIdAndAction', () => {
    it('should set id and action', () => {
      service.setIdAndAction('test-id', 'CREATE_CT');
      expect(service.id).to.equal('test-id');
      expect(service.action).to.equal('CREATE_CT');
    });
  });

  describe('getActions', () => {
    it('should add action to moveFieldActions', () => {
      const action = { action: 'toTheTop', fieldToMove: 'field1' };
      service.getActions(action);
      expect(service.moveFieldActions).to.have.length(1);
      expect(service.moveFieldActions[0]).to.equal(action);
    });
  });

  describe('toTheTop', () => {
    it('should move field to the top of schema', () => {
      const schema = [
        { uid: 'field1', data_type: 'text' },
        { uid: 'field2', data_type: 'text' },
        { uid: 'field3', data_type: 'text' },
      ];
      const actionObj = { fieldToMove: 'field2' };
      const result = service.toTheTop(schema, actionObj);

      expect(result[0].uid).to.equal('field2');
      expect(result).to.have.length(3);
    });

    it('should handle field not found', () => {
      const schema = [{ uid: 'field1', data_type: 'text' }];
      const actionObj = { fieldToMove: 'nonexistent' };
      const result = service.toTheTop(schema, actionObj);

      expect(result[0].uid).to.equal('field1');
    });
  });

  describe('toTheBottom', () => {
    it('should move field to the bottom of schema', () => {
      const schema = [
        { uid: 'field1', data_type: 'text' },
        { uid: 'field2', data_type: 'text' },
        { uid: 'field3', data_type: 'text' },
      ];
      const actionObj = { fieldToMove: 'field1' };
      const result = service.toTheBottom(schema, actionObj);

      expect(result[result.length - 1].uid).to.equal('field1');
      expect(result).to.have.length(3);
    });
  });

  describe('afterField', () => {
    it('should move field after another field', () => {
      const schema = [
        { uid: 'field1', data_type: 'text' },
        { uid: 'field2', data_type: 'text' },
        { uid: 'field3', data_type: 'text' },
      ];
      const actionObj = { fieldToMove: 'field3', against: 'field1' };
      const result = service.afterField(schema, actionObj);

      expect(result[1].uid).to.equal('field3');
      expect(result).to.have.length(3);
    });
  });

  describe('beforeField', () => {
    it('should move field before another field', () => {
      const schema = [
        { uid: 'field1', data_type: 'text' },
        { uid: 'field2', data_type: 'text' },
        { uid: 'field3', data_type: 'text' },
      ];
      const actionObj = { fieldToMove: 'field3', against: 'field1' };
      const result = service.beforeField(schema, actionObj);

      expect(result[0].uid).to.equal('field3');
      expect(result).to.have.length(3);
    });
  });

  describe('getValidated', () => {
    it('should validate that both fields exist', () => {
      const schema = [
        { uid: 'field1', data_type: 'text' },
        { uid: 'field2', data_type: 'text' },
      ];
      const actionObj = { fieldToMove: 'field1', against: 'field2' };
      const result = service.getValidated(schema, actionObj);

      expect(result.isValid).to.be.true;
      expect(result.missingField).to.be.null;
    });

    it('should return invalid if fieldToMove is missing', () => {
      const schema = [{ uid: 'field1', data_type: 'text' }];
      const actionObj = { fieldToMove: 'nonexistent', against: 'field1' };
      const result = service.getValidated(schema, actionObj);

      expect(result.isValid).to.be.false;
      expect(result.missingField).to.equal('nonexistent');
    });

    it('should return invalid if against field is missing', () => {
      const schema = [{ uid: 'field1', data_type: 'text' }];
      const actionObj = { fieldToMove: 'field1', against: 'nonexistent' };
      const result = service.getValidated(schema, actionObj);

      expect(result.isValid).to.be.false;
      expect(result.missingField).to.equal('nonexistent');
    });

    it('should validate fieldToMove only when against is not provided', () => {
      const schema = [{ uid: 'field1', data_type: 'text' }];
      const actionObj = { fieldToMove: 'field1' };
      const result = service.getValidated(schema, actionObj);

      expect(result.isValid).to.be.true;
      expect(result.missingField).to.be.null;
    });
  });


  describe('applyActionsOnFields', () => {
    it.skip('should apply move field actions successfully', (done) => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const data = {
        schema: [
          { uid: 'field1', data_type: 'text' },
          { uid: 'field2', data_type: 'text' },
        ] as any[],
      };
      service.getActions({ action: 'toTheTop', fieldToMove: 'field2' });
      service.setIdAndAction('test-id', 'EDIT_CT');

      getStub.callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
        const existing = mapInstance.get(key);
        if (existing !== undefined) return existing;
        if (key === 'MANAGEMENT_SDK') {
          mapInstance.set(key, mockStackSDK);
          return mockStackSDK;
        }
        if (key === 'test-id') {
          const value = {
            EDIT_CT: {
              content_type: { schema: [] as any[] },
            },
          };
          mapInstance.set(key, value);
          return value;
        }
        const defaultValue = data !== undefined ? data : {};
        mapInstance.set(key, defaultValue);
        return defaultValue;
      });

      service.applyActionsOnFields(callsite, data, (err: any, result: any) => {
        expect(err).to.be.null;
        expect(result.schema[0].uid).to.equal('field2');
        done();
      });
    });

    it('should handle errors in mergeEditSchema', (done) => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const data = { schema: [] as any[] };
      service.setIdAndAction('test-id', 'EDIT_CT');

      getStub.callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
        throw new Error('Map error');
      });

      service.applyActionsOnFields(callsite, data, (err: any) => {
        expect(err).to.exist;
        expect(mockBase.dispatch.called).to.be.true;
        done();
      });
    });


    it('should return data directly when no callback provided', () => {
      const callsite = { getFileName: () => 'test.js', getLineNumber: () => 1 };
      const data = { schema: [] as any[] };
      service.setIdAndAction('test-id', 'EDIT_CT');

      getStub.callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
        const existing = mapInstance.get(key);
        if (existing !== undefined) return existing;
        if (key === 'MANAGEMENT_SDK') {
          mapInstance.set(key, mockStackSDK);
          return mockStackSDK;
        }
        if (key === 'test-id') {
          const value = {
            EDIT_CT: {
              content_type: { schema: [] as any[] },
            },
          };
          mapInstance.set(key, value);
          return value;
        }
        const defaultValue = data !== undefined ? data : {};
        mapInstance.set(key, defaultValue);
        return defaultValue;
      });

      const result = service.applyActionsOnFields(callsite, data);
      expect(result).to.equal(data);
    });
  });
});
