import { expect } from 'chai';
import { SinonStub, createSandbox } from 'sinon';
import Field from '../../../src/modules/fields';
import * as mapModule from '../../../src/utils/map';
import * as schemaHelperModule from '../../../src/utils/schema-helper';

describe('Fields Module', () => {
  let field: Field;
  let sandbox: ReturnType<typeof createSandbox>;
  let getStub: SinonStub;
  let getSchemaStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockContentTypeService: any;
  let mockRequest: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    
    // Stub map utilities
    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    // Default return value for get - will be overridden in specific tests
    const defaultContentType = {
      CREATE_CT: {
        content_type: {
          schema: [] as any[],
        },
      },
    };
    // Set default in map instance
    mockMapInstance.set('test-ct', defaultContentType);
    getStub = sandbox.stub(mapModule, 'get').callsFake((id: string, mapInstance: Map<string, any>, data?: any) => {
      const existing = mapInstance.get(id);
      if (existing !== undefined) {
        return existing;
      }
      // If not found, set default and return it (matching real get behavior)
      const defaultValue = data !== undefined ? data : defaultContentType;
      mapInstance.set(id, defaultValue);
      return defaultValue;
    });

    // Stub schema helper
    getSchemaStub = sandbox.stub(schemaHelperModule, 'getSchema').returns({
      uid: 'test-field',
      data_type: 'text',
    });

    // Mock ContentTypeService
    mockContentTypeService = {
      getActions: sandbox.stub(),
    };

    // Mock request
    mockRequest = {
      title: 'Test Request',
      tasks: [],
    };

    field = new Field('test-ct', 'CREATE_CT', mockContentTypeService, mockRequest);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Class Definition', () => {
    it('should export Field class', () => {
      expect(Field).to.exist;
    });

    it('should be instantiable with required parameters', () => {
      const instance = new Field('test-ct', 'CREATE_CT', mockContentTypeService, mockRequest);
      expect(instance).to.be.instanceOf(Field);
      expect(instance.uid).to.equal('test-ct');
      expect(instance.action).to.equal('CREATE_CT');
      expect(instance.contentTypeService).to.equal(mockContentTypeService);
      expect(instance.request).to.equal(mockRequest);
    });
  });

  describe('createField(), editField(), deleteField() and chain (real map)', () => {
    let mapInstance: Map<string, any>;

    beforeEach(function () {
      sandbox.restore();
      mapInstance = mapModule.getMapInstance();
      mapInstance.set('test-ct', {
        CREATE_CT: {
          content_type: {
            schema: [] as any[],
          },
        },
      });
      getSchemaStub = sandbox.stub(schemaHelperModule, 'getSchema');
      mockContentTypeService = { getActions: sandbox.stub() };
      mockRequest = { title: 'Test', tasks: [] };
      field = new Field('test-ct', 'CREATE_CT', mockContentTypeService, mockRequest);
    });

    afterEach(function () {
      mapInstance.delete('test-ct');
    });

    it('should update schema and apply options when opts provided', () => {
      getSchemaStub.returns({
        uid: 'author',
        display_name: 'author',
        data_type: 'text',
        mandatory: false,
        unique: false,
        field_metadata: {},
        non_localizable: false,
        isDelete: false,
        isEdit: false,
      });
      const result = field.createField('author', { display_name: 'Author', data_type: 'text' });

      const schema = mapInstance.get('test-ct').CREATE_CT.content_type.schema;
      expect(schema).to.have.lengthOf(1);
      expect(schema[0].uid).to.equal('author');
      expect(schema[0].display_name).to.equal('Author');
      expect(schema[0].data_type).to.equal('text');
      expect(result).to.equal(field);
    });

    it('should update schema only and return this when opts omitted', () => {
      getSchemaStub.returns({
        uid: 'title',
        display_name: 'title',
        data_type: 'text',
        mandatory: false,
        unique: false,
        field_metadata: {},
        non_localizable: false,
        isDelete: false,
        isEdit: false,
      });
      const result = field.createField('title');

      expect(field.field).to.equal('title');
      const schema = mapInstance.get('test-ct').CREATE_CT.content_type.schema;
      expect(schema).to.have.lengthOf(1);
      expect(schema[0].uid).to.equal('title');
      expect(result).to.equal(field);
    });

    it('should update schema with EDIT_FIELD and apply options when opts provided', () => {
      getSchemaStub.returns({
        uid: 'uniqueid',
        display_name: 'uniqueid',
        data_type: 'text',
        mandatory: false,
        unique: false,
        field_metadata: {},
        non_localizable: false,
        isDelete: false,
        isEdit: true,
      });
      const result = field.editField('uniqueid', { display_name: 'Unique ID', mandatory: false });

      const schema = mapInstance.get('test-ct').CREATE_CT.content_type.schema;
      expect(schema).to.have.lengthOf(1);
      expect(schema[0].uid).to.equal('uniqueid');
      expect(schema[0].display_name).to.equal('Unique ID');
      expect(schema[0].mandatory).to.equal(false);
      expect(result).to.equal(field);
    });

    it('should update schema with DELETE_FIELD', () => {
      getSchemaStub.returns({
        uid: 'oldfield',
        display_name: 'oldfield',
        data_type: 'text',
        mandatory: false,
        unique: false,
        field_metadata: {},
        non_localizable: false,
        isDelete: true,
        isEdit: false,
      });
      const result = field.deleteField('oldfield');

      const schema = mapInstance.get('test-ct').CREATE_CT.content_type.schema;
      expect(schema).to.have.lengthOf(1);
      expect(schema[0].uid).to.equal('oldfield');
      expect(schema[0].isDelete).to.be.true;
      expect(result).to.equal(field);
    });

    it('should mutate schema via display_name and data_type chain', () => {
      getSchemaStub.returns({
        uid: 'author',
        display_name: 'author',
        data_type: 'text',
        mandatory: false,
        unique: false,
        field_metadata: {},
        non_localizable: false,
        isDelete: false,
        isEdit: false,
      });
      field.createField('author').display_name('Author Name').data_type('single_line');

      const schema = mapInstance.get('test-ct').CREATE_CT.content_type.schema;
      expect(schema[0].display_name).to.equal('Author Name');
      expect(schema[0].data_type).to.equal('single_line');
    });
  });

  describe('moveField()', () => {
    it('should set fieldToMove and return instance for chaining', () => {
      const result = field.moveField('test-field');

      expect(field.fieldToMove).to.equal('test-field');
      expect(result).to.equal(field);
    });
  });



  describe('Field movement methods', () => {
    beforeEach(() => {
      field.fieldToMove = 'field-to-move';
    });

    it('should call toTheBottom', () => {
      field.toTheBottom();

      expect(mockContentTypeService.getActions.calledWith({
        action: 'toTheBottom',
        fieldToMove: 'field-to-move',
      })).to.be.true;
    });

    it('should throw error when toTheBottom is called without moveField', () => {
      field.fieldToMove = undefined;

      expect(() => field.toTheBottom()).to.throw('Cannot access this method directly.');
    });

    it('should call toTheTop', () => {
      field.toTheTop();

      expect(mockContentTypeService.getActions.calledWith({
        action: 'toTheTop',
        fieldToMove: 'field-to-move',
      })).to.be.true;
    });

    it('should throw error when toTheTop is called without moveField', () => {
      field.fieldToMove = undefined;

      expect(() => field.toTheTop()).to.throw('Cannot access this method directly.');
    });

    it('should call afterField', () => {
      field.afterField('target-field');

      expect(mockContentTypeService.getActions.calledWith({
        action: 'afterField',
        fieldToMove: 'field-to-move',
        against: 'target-field',
      })).to.be.true;
    });

    it('should throw error when afterField is called without moveField', () => {
      field.fieldToMove = undefined;

      expect(() => field.afterField('target')).to.throw('Cannot access this method directly.');
    });

    it('should call beforeField', () => {
      field.beforeField('target-field');

      expect(mockContentTypeService.getActions.calledWith({
        action: 'beforeField',
        fieldToMove: 'field-to-move',
        against: 'target-field',
      })).to.be.true;
    });

    it('should throw error when beforeField is called without moveField', () => {
      field.fieldToMove = undefined;

      expect(() => field.beforeField('target')).to.throw('Cannot access this method directly.');
    });
  });


  describe('getTaskDefinition()', () => {
    it('should return request object', () => {
      const result = field.getTaskDefinition();

      expect(result).to.equal(mockRequest);
    });
  });

  describe('getSchemaFromOptions()', () => {
    it('should build schema from options object', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            schema: [
              { uid: 'test-field', data_type: 'text' },
            ],
          },
        },
      };
      mockMapInstance.set('test-ct', mockContentType);
      getStub.callsFake((id: string, mapInstance: Map<string, any>) => mapInstance.get(id) || mockContentType);
      const buildSchemaStub = sandbox.stub(field, 'buildSchema' as any);

      const opts = {
        display_name: 'Test Field',
        mandatory: true,
        data_type: 'text',
      };

      field.getSchemaFromOptions(opts, 'test-field');

      expect(buildSchemaStub.calledWith('display_name', 'test-field', 'Test Field')).to.be.true;
      expect(buildSchemaStub.calledWith('mandatory', 'test-field', true)).to.be.true;
      expect(buildSchemaStub.calledWith('data_type', 'test-field', 'text')).to.be.true;
    });

    it('should handle empty options object', () => {
      const buildSchemaStub = sandbox.stub(field, 'buildSchema' as any);

      field.getSchemaFromOptions({}, 'test-field');

      expect(buildSchemaStub.called).to.be.false;
    });

    it('should handle options with multiple properties', () => {
      const mockContentType: any = {
        CREATE_CT: {
          content_type: {
            schema: [
              { uid: 'test-field', data_type: 'text' },
            ],
          },
        },
      };
      mockMapInstance.set('test-ct', mockContentType);
      getStub.callsFake((id: string, mapInstance: Map<string, any>) => mapInstance.get(id) || mockContentType);
      const buildSchemaStub = sandbox.stub(field, 'buildSchema' as any);

      const opts = {
        display_name: 'Test Field',
        mandatory: true,
        data_type: 'text',
        unique: false,
        default: 'default-value',
      };

      field.getSchemaFromOptions(opts, 'test-field');

      expect(buildSchemaStub.callCount).to.equal(5);
      expect(buildSchemaStub.calledWith('display_name', 'test-field', 'Test Field')).to.be.true;
      expect(buildSchemaStub.calledWith('mandatory', 'test-field', true)).to.be.true;
      expect(buildSchemaStub.calledWith('data_type', 'test-field', 'text')).to.be.true;
      expect(buildSchemaStub.calledWith('unique', 'test-field', false)).to.be.true;
      expect(buildSchemaStub.calledWith('default', 'test-field', 'default-value')).to.be.true;
    });
  });

});
