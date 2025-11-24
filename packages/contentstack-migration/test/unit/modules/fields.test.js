'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const Field = require('../../../src/modules/fields');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { actions, _actions } = constants;
const { resetMap } = require('../../setup/test-helpers');

describe('Field Module', () => {
  let contentTypeService;
  let mapInstance;
  let request;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
    request = {
      title: 'Test Request',
      tasks: [],
    };
    contentTypeService = {
      getActions: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize field with uid, action, and service', () => {
      const field = new Field('test-ct', actions.CREATE_CT, contentTypeService, request);
      expect(field.uid).to.equal('test-ct');
      expect(field.action).to.equal(actions.CREATE_CT);
      expect(field.contentTypeService).to.equal(contentTypeService);
      expect(field.request).to.equal(request);
    });
  });

  describe('createField', () => {
    it('should create a field and update schema', () => {
      const field = new Field('test-ct', actions.CREATE_CT, contentTypeService, request);

      // Setup content type in map
      _map.set('test-ct', mapInstance, {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'test-ct',
            schema: [],
          },
        },
      });

      const result = field.createField('author');
      expect(result).to.equal(field);
      expect(field.field).to.equal('author');

      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema).to.be.an('array');
      expect(ctData[actions.CREATE_CT].content_type.schema.length).to.equal(1);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].uid).to.equal('author');
    });

    it('should create field with options object', () => {
      const field = new Field('test-ct', actions.CREATE_CT, contentTypeService, request);

      _map.set('test-ct', mapInstance, {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'test-ct',
            schema: [],
          },
        },
      });

      const result = field.createField('author', {
        display_name: 'Author',
        data_type: 'text',
        mandatory: true,
      });

      expect(result).to.equal(field);
      const ctData = _map.get('test-ct', mapInstance);
      const schemaField = ctData[actions.CREATE_CT].content_type.schema[0];
      expect(schemaField.display_name).to.equal('Author');
      expect(schemaField.data_type).to.equal('text');
      expect(schemaField.mandatory).to.equal(true);
    });
  });

  describe('editField', () => {
    it('should edit a field', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);

      _map.set('test-ct', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'test-ct',
            schema: [],
          },
        },
      });

      const result = field.editField('author');
      expect(result).to.equal(field);
      expect(field.field).to.equal('author');

      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.EDIT_CT].content_type.schema[0].isEdit).to.equal(true);
    });
  });

  describe('deleteField', () => {
    it('should delete a field', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);

      _map.set('test-ct', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'test-ct',
            schema: [],
          },
        },
      });

      const result = field.deleteField('author');
      expect(result).to.equal(field);

      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.EDIT_CT].content_type.schema[0].isDelete).to.equal(true);
    });
  });

  describe('field property setters', () => {
    beforeEach(() => {
      const field = new Field('test-ct', actions.CREATE_CT, contentTypeService, request);
      _map.set('test-ct', mapInstance, {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'test-ct',
            schema: [{ uid: 'author' }],
          },
        },
      });
      field.field = 'author';
      this.field = field;
    });

    it('should set display_name', () => {
      const result = this.field.display_name('Author Name');
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].display_name).to.equal('Author Name');
    });

    it('should set data_type', () => {
      const result = this.field.data_type('text');
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].data_type).to.equal('text');
    });

    it('should set mandatory', () => {
      const result = this.field.mandatory(true);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].mandatory).to.equal(true);
    });

    it('should set default value', () => {
      const result = this.field.default('Default Author');
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].default).to.equal('Default Author');
    });

    it('should set unique', () => {
      const result = this.field.unique(true);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].unique).to.equal(true);
    });

    it('should set reference_to', () => {
      const result = this.field.reference_to('author_ct');
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].reference_to).to.equal('author_ct');
    });

    it('should set ref_multiple', () => {
      const result = this.field.ref_multiple(true);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].field_metadata.ref_multiple).to.equal(true);
    });

    it('should set taxonomies', () => {
      const taxonomies = [{ taxonomy_uid: 'tax1', max_terms: 2 }];
      const result = this.field.taxonomies(taxonomies);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].taxonomies).to.deep.equal(taxonomies);
    });

    it('should set multiple', () => {
      const result = this.field.multiple(true);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].multiple).to.equal(true);
    });

    it('should set ref_multipleContentType', () => {
      const result = this.field.ref_multipleContentType(true);
      expect(result).to.equal(this.field);
      const ctData = _map.get('test-ct', mapInstance);
      expect(ctData[actions.CREATE_CT].content_type.schema[0].field_metadata.ref_multiple_content_types).to.equal(true);
    });
  });

  describe('moveField', () => {
    it('should set fieldToMove property', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      const result = field.moveField('author');
      expect(result).to.equal(field);
      expect(field.fieldToMove).to.equal('author');
    });
  });

  describe('moveField methods', () => {
    it('should call toTheTop on contentTypeService', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      field.fieldToMove = 'author';
      field.toTheTop();
      expect(contentTypeService.getActions).to.have.been.calledWith({
        action: 'toTheTop',
        fieldToMove: 'author',
      });
    });

    it('should call toTheBottom on contentTypeService', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      field.fieldToMove = 'author';
      field.toTheBottom();
      expect(contentTypeService.getActions).to.have.been.calledWith({
        action: 'toTheBottom',
        fieldToMove: 'author',
      });
    });

    it('should call afterField on contentTypeService', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      field.fieldToMove = 'author';
      field.afterField('title');
      expect(contentTypeService.getActions).to.have.been.calledWith({
        action: 'afterField',
        fieldToMove: 'author',
        against: 'title',
      });
    });

    it('should call beforeField on contentTypeService', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      field.fieldToMove = 'author';
      field.beforeField('title');
      expect(contentTypeService.getActions).to.have.been.calledWith({
        action: 'beforeField',
        fieldToMove: 'author',
        against: 'title',
      });
    });

    it('should throw error if moveField methods called without fieldToMove', () => {
      const field = new Field('test-ct', actions.EDIT_CT, contentTypeService, request);
      expect(() => field.toTheTop()).to.throw('Cannot access this method directly.');
      expect(() => field.toTheBottom()).to.throw('Cannot access this method directly.');
      expect(() => field.afterField('title')).to.throw('Cannot access this method directly.');
      expect(() => field.beforeField('title')).to.throw('Cannot access this method directly.');
    });
  });

  describe('getTaskDefinition', () => {
    it('should return request object', () => {
      const field = new Field('test-ct', actions.CREATE_CT, contentTypeService, request);
      expect(field.getTaskDefinition()).to.equal(request);
    });
  });
});
