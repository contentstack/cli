import { expect } from 'chai';
import { SinonStub, createSandbox } from 'sinon';
import ContentType from '../../../src/modules/content-types';
import * as mapModule from '../../../src/utils/map';
import * as schemaHelperModule from '../../../src/utils/schema-helper';
import * as getCallsiteModule from '../../../src/utils/callsite';

describe('Content Types Module', () => {
  let contentType: ContentType;
  let sandbox: ReturnType<typeof createSandbox>;
  let setStub: SinonStub;
  let getStub: SinonStub;
  let getUidStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockContentTypeService: any;
  let dispatchStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    contentType = new ContentType();
    
    // Stub map utilities
    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    setStub = sandbox.stub(mapModule, 'set');
    getStub = sandbox.stub(mapModule, 'get').returns({
      CREATE_CT: {
        content_type: {
          title: '',
          description: '',
          schema: [] as any[],
          options: {},
        },
      },
    });

    // Stub schema helper
    getUidStub = sandbox.stub(schemaHelperModule, 'getUid').callsFake((id: string) => id);

    // Stub callsite
    const mockCallsite = {
      getFileName: () => 'test.js',
      getLineNumber: () => 1,
    };
    sandbox.stub(getCallsiteModule, 'default').returns(mockCallsite as any);

    // Stub dispatch
    dispatchStub = sandbox.stub(ContentType.prototype, 'dispatch' as any);

    // Mock ContentTypeService
    mockContentTypeService = {
      setIdAndAction: sandbox.stub(),
      postContentTypes: sandbox.stub().resolves(),
      fetchContentType: sandbox.stub().resolves(),
      applyActionsOnFields: sandbox.stub().resolves(),
      editContentType: sandbox.stub().resolves(),
      deleteContentType: sandbox.stub().resolves(),
    };
    sandbox.stub(contentType, 'contentTypeService').value(mockContentTypeService);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Class Definition', () => {
    it('should export ContentType class', () => {
      expect(ContentType).to.exist;
    });

    it('should be instantiable', () => {
      const instance = new ContentType();
      expect(instance).to.be.instanceOf(ContentType);
      expect(instance.contentTypeService).to.exist;
    });
  });

  describe('createContentType()', () => {
    it.skip('should create content type with id and options', () => {
      const opts = {
        title: 'Test Content Type',
        description: 'Test Description',
      };
      const field = contentType.createContentType('test-ct', opts);

      expect(dispatchStub.called).to.be.true;
      expect(getUidStub.calledWith('test-ct')).to.be.true;
      expect(setStub.called).to.be.true;
      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
      expect(mockContentTypeService.setIdAndAction.calledWith('test-ct', 'CREATE_CT')).to.be.true;
      expect(field).to.exist;
    });

    it.skip('should create content type with default options', () => {
      const field = contentType.createContentType('test-ct');

      expect(dispatchStub.called).to.be.true;
      expect(setStub.called).to.be.true;
      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
      expect(field).to.exist;
    });

    it('should attach singleton and isPage methods to field', () => {
      const field = contentType.createContentType('test-ct');
      
      expect((field as any).singleton).to.be.a('function');
      expect((field as any).isPage).to.be.a('function');
    });

    it('should set correct request object with tasks', () => {
      const field = contentType.createContentType('test-ct', { title: 'Test' });
      
      expect(field.request).to.have.property('title', 'Adding content type: test-ct');
      expect(field.request).to.have.property('failMessage', 'Failed to create content type: test-ct');
      expect(field.request).to.have.property('successMessage', 'Successfully added content type: test-ct');
      expect(field.request.tasks).to.be.an('array');
    });
  });

  describe('singleton()', () => {
    it.skip('should set singleton option to true', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            options: {},
          },
        },
      };
      getStub.callsFake(() => mockContentType);
      (contentType as any).id = 'test-ct';
      (contentType as any).action = 'CREATE_CT';

      const result = contentType.singleton(true);

      expect(result).to.equal(contentType);
      expect(mockContentType.CREATE_CT.content_type.options.singleton).to.be.true;
    });

    it.skip('should set singleton option to false', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            options: {},
          },
        },
      };
      getStub.callsFake(() => mockContentType);
      (contentType as any).id = 'test-ct';
      (contentType as any).action = 'CREATE_CT';

      contentType.singleton(false);

      expect(mockContentType.CREATE_CT.content_type.options.singleton).to.be.false;
    });
  });

  describe('isPage()', () => {
    it.skip('should set is_page option to true', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            options: {},
          },
        },
      };
      getStub.callsFake(() => mockContentType);
      (contentType as any).id = 'test-ct';
      (contentType as any).action = 'CREATE_CT';

      const result = contentType.isPage(true);

      expect(result).to.equal(contentType);
      expect(mockContentType.CREATE_CT.content_type.options.is_page).to.be.true;
    });

    it.skip('should set is_page option to false', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            options: {},
          },
        },
      };
      getStub.callsFake(() => mockContentType);
      (contentType as any).id = 'test-ct';
      (contentType as any).action = 'CREATE_CT';

      contentType.isPage(false);

      expect(mockContentType.CREATE_CT.content_type.options.is_page).to.be.false;
    });
  });

  describe('editContentType()', () => {
    it.skip('should edit content type with id and options', () => {
      const opts = {
        title: 'Updated Title',
        description: 'Updated Description',
      };
      const existingContentType: any = {
        EDIT_CT: {
          content_type: {
            schema: [] as any[],
          },
        },
      };
      getStub.callsFake(() => existingContentType);

      const field = contentType.editContentType('test-ct', opts);

      expect(dispatchStub.called).to.be.true;
      expect(setStub.called).to.be.true;
      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
      expect(mockContentTypeService.setIdAndAction.calledWith('test-ct', 'EDIT_CT')).to.be.true;
      expect(field).to.exist;
    });

    it.skip('should merge with existing content type actions', () => {
      const existingContentType: any = {
        EDIT_CT: {
          content_type: {
            schema: [] as any[],
          },
        },
        CREATE_CT: {
          content_type: {},
        },
      };
      getStub.callsFake(() => existingContentType);

      contentType.editContentType('test-ct');

      expect(setStub.called).to.be.true;
      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
    });

    it('should set correct request object with multiple tasks', () => {
      const field = contentType.editContentType('test-ct', { title: 'Test' });
      
      expect(field.request).to.have.property('title', 'Editing content type: test-ct');
      expect(field.request).to.have.property('failMessage', 'Failed to edit content type: test-ct');
      expect(field.request).to.have.property('successMessage', 'Successfully updated content type: test-ct');
      expect(field.request.tasks).to.be.an('array');
      expect(field.request.tasks.length).to.equal(3);
    });

    it('should attach singleton and isPage methods to field', () => {
      const field = contentType.editContentType('test-ct');
      
      expect((field as any).singleton).to.be.a('function');
      expect((field as any).isPage).to.be.a('function');
    });
  });

  describe('deleteContentType()', () => {
    it.skip('should delete content type with id', () => {
      const field = contentType.deleteContentType('test-ct');

      expect(getUidStub.calledWith('test-ct')).to.be.true;
      expect(setStub.called).to.be.true;
      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
      expect(mockContentTypeService.setIdAndAction.calledWith('test-ct', 'DELETE_CT')).to.be.true;
      expect(field).to.exist;
    });

    it.skip('should set force to false by default', () => {
      contentType.deleteContentType('test-ct');

      const setCall = setStub.getCalls().find(call => call.args[0] === 'test-ct');
      expect(setCall).to.exist;
      const ctActionObj = setCall.args[2];
      expect(ctActionObj.DELETE_CT.content_type.force).to.be.false;
    });

    it('should set correct request object with delete task', () => {
      const field = contentType.deleteContentType('test-ct');
      
      expect(field.request).to.have.property('title', 'Deleting content type');
      expect(field.request.tasks).to.be.an('array');
      expect(field.request.tasks.length).to.equal(1);
    });
  });
});
