'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const ContentTypeService = require('../../../src/services/content-types');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { actions, MANAGEMENT_SDK } = constants;
const { resetMap, createMockCallsite, createMockStackSDK } = require('../../setup/test-helpers');

describe('ContentTypeService', () => {
  let service;
  let mapInstance;
  let mockStackSDK;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
    mockStackSDK = createMockStackSDK();
    _map.set(MANAGEMENT_SDK, mapInstance, mockStackSDK);
    service = new ContentTypeService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with stack SDK instance', () => {
      expect(service.stackSDKInstance).to.equal(mockStackSDK);
      expect(service.moveFieldActions).to.be.an('array');
      expect(service.base).to.exist;
    });
  });

  describe('setIdAndAction', () => {
    it('should set id and action', () => {
      service.setIdAndAction('test-ct', actions.CREATE_CT);
      expect(service.id).to.equal('test-ct');
      expect(service.action).to.equal(actions.CREATE_CT);
    });
  });

  describe('fetchContentType', () => {
    it('should fetch content type successfully', async () => {
      const callsite = createMockCallsite();
      const contentTypeData = { uid: 'blog', title: 'Blog', schema: [] };
      const fetchStub = sinon.stub().resolves({ content_type: contentTypeData });
      mockStackSDK.contentType.returns({ fetch: fetchStub });

      service.setIdAndAction('blog', actions.EDIT_CT);
      const result = await service.fetchContentType(callsite, 'blog');

      // fetchContentType returns result || {}, and result is { content_type: {...} }
      // But the code does: return result || {}; where result is the full response
      // So it returns { content_type: {...} }, not just the content_type
      expect(result).to.deep.equal({ content_type: contentTypeData });
      expect(mockStackSDK.contentType).to.have.been.calledWith('blog');
      expect(fetchStub).to.have.been.called;
    });

    it('should handle fetch errors', async () => {
      const callsite = createMockCallsite();
      const error = new Error('Fetch failed');
      mockStackSDK.contentType().fetch.rejects(error);

      service.setIdAndAction('blog', actions.EDIT_CT);

      try {
        await service.fetchContentType(callsite, 'blog');
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('postContentTypes', () => {
    it('should create content type successfully', async () => {
      const callsite = createMockCallsite();
      const contentTypeData = {
        content_type: {
          uid: 'blog',
          title: 'Blog',
          description: 'Blog description',
          schema: [],
        },
      };

      _map.set('blog', mapInstance, {
        [actions.CREATE_CT]: contentTypeData,
      });

      mockStackSDK.contentType().create.resolves({ content_type: contentTypeData.content_type });

      service.setIdAndAction('blog', actions.CREATE_CT);
      const result = await service.postContentTypes(callsite, 'blog', actions.CREATE_CT);

      expect(result).to.deep.equal(contentTypeData.content_type);
      expect(mockStackSDK.contentType).to.have.been.called;
      expect(mockStackSDK.contentType().create).to.have.been.called;
    });

    it('should handle create errors', async () => {
      const callsite = createMockCallsite();
      const error = new Error('Create failed');
      mockStackSDK.contentType().create.rejects(error);

      _map.set('blog', mapInstance, {
        [actions.CREATE_CT]: {
          content_type: { uid: 'blog', title: 'Blog' },
        },
      });

      service.setIdAndAction('blog', actions.CREATE_CT);

      try {
        await service.postContentTypes(callsite, 'blog', actions.CREATE_CT);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('editContentType', () => {
    it('should edit content type successfully', async () => {
      const callsite = createMockCallsite();
      const contentTypeData = {
        uid: 'blog',
        title: 'Updated Blog',
        schema: [],
        update: sinon.stub().resolves({ content_type: { uid: 'blog', title: 'Updated Blog' } }),
      };

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: { description: 'Updated description' },
        },
      });

      service.setIdAndAction('blog', actions.EDIT_CT);
      const result = await service.editContentType(callsite, contentTypeData);

      expect(result.uid).to.equal('blog');
      expect(contentTypeData.update).to.have.been.calledOnce;
    });

    it('should handle edit errors', async () => {
      const callsite = createMockCallsite();
      const error = new Error('Edit failed');
      const contentTypeData = {
        uid: 'blog',
        update: sinon.stub().rejects(error),
      };

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {},
        },
      });

      service.setIdAndAction('blog', actions.EDIT_CT);

      try {
        await service.editContentType(callsite, contentTypeData);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('deleteContentType', () => {
    it('should delete content type successfully', async () => {
      const callsite = createMockCallsite();
      mockStackSDK.contentType().delete.resolves({ content_type: { uid: 'blog' } });

      service.setIdAndAction('blog', actions.DELETE_CT);
      const result = await service.deleteContentType(callsite);

      expect(result.uid).to.equal('blog');
      expect(mockStackSDK.contentType).to.have.been.calledWith('blog');
      expect(mockStackSDK.contentType().delete).to.have.been.called;
    });

    it('should handle delete errors', async () => {
      const callsite = createMockCallsite();
      const error = new Error('Delete failed');
      mockStackSDK.contentType().delete.rejects(error);

      service.setIdAndAction('blog', actions.DELETE_CT);

      try {
        await service.deleteContentType(callsite);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('getActions', () => {
    it('should add move field action', () => {
      const action = { action: 'toTheTop', fieldToMove: 'author' };
      service.getActions(action);
      expect(service.moveFieldActions.length).to.equal(1);
      expect(service.moveFieldActions[0]).to.deep.equal(action);
    });
  });

  describe('mergeEditSchema', () => {
    it('should merge new fields with existing schema', () => {
      service.setIdAndAction('blog', actions.EDIT_CT);
      const existingSchema = [
        { uid: 'title', display_name: 'Title' },
        { uid: 'description', display_name: 'Description' },
      ];

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [{ uid: 'title', display_name: 'Author', isEdit: true }],
          },
        },
      });

      const result = service.mergeEditSchema(existingSchema);
      expect(result.length).to.equal(2);
      expect(result.find((f) => f.uid === 'title')).to.exist;
      expect(result.find((f) => f.uid === 'description')).to.exist;
    });

    it('should handle delete field action', () => {
      service.setIdAndAction('blog', actions.EDIT_CT);
      const existingSchema = [
        { uid: 'title', display_name: 'Title' },
        { uid: 'author', display_name: 'Author' },
      ];

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [{ uid: 'author', isDelete: true }],
          },
        },
      });

      const result = service.mergeEditSchema(existingSchema);
      expect(result.find((f) => f.uid === 'author')).to.not.exist;
      expect(result.length).to.equal(1);
    });

    it('should throw error if edit field does not exist', () => {
      service.setIdAndAction('blog', actions.EDIT_CT);
      const existingSchema = [{ uid: 'title', display_name: 'Title' }];

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [{ uid: 'nonexistent', isEdit: true }],
          },
        },
      });

      expect(() => service.mergeEditSchema(existingSchema)).to.throw('nonexistent does not exist');
    });

    it('should throw error if delete field does not exist', () => {
      service.setIdAndAction('blog', actions.EDIT_CT);
      const existingSchema = [{ uid: 'title', display_name: 'Title' }];

      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [{ uid: 'nonexistent', isDelete: true }],
          },
        },
      });

      expect(() => service.mergeEditSchema(existingSchema)).to.throw('nonexistent does not exist');
    });
  });

  describe('toTheTop', () => {
    it('should move field to top of schema', () => {
      const schema = [
        { uid: 'field1' },
        { uid: 'field2' },
        { uid: 'field3' },
      ];
      const actionObj = { fieldToMove: 'field3' };

      const result = service.toTheTop(schema, actionObj);
      expect(result[0].uid).to.equal('field3');
      expect(result.length).to.equal(3);
    });
  });

  describe('toTheBottom', () => {
    it('should move field to bottom of schema', () => {
      const schema = [
        { uid: 'field1' },
        { uid: 'field2' },
        { uid: 'field3' },
      ];
      const actionObj = { fieldToMove: 'field1' };

      const result = service.toTheBottom(schema, actionObj);
      expect(result[result.length - 1].uid).to.equal('field1');
      expect(result.length).to.equal(3);
    });
  });

  describe('afterField', () => {
    it('should move field after specified field', () => {
      const schema = [
        { uid: 'field1' },
        { uid: 'field2' },
        { uid: 'field3' },
      ];
      const actionObj = { fieldToMove: 'field3', against: 'field1' };

      const result = service.afterField(schema, actionObj);
      const field1Index = result.findIndex((f) => f.uid === 'field1');
      const field3Index = result.findIndex((f) => f.uid === 'field3');
      expect(field3Index).to.equal(field1Index + 1);
    });
  });

  describe('beforeField', () => {
    it('should move field before specified field', () => {
      const schema = [
        { uid: 'field1' },
        { uid: 'field2' },
        { uid: 'field3' },
      ];
      const actionObj = { fieldToMove: 'field3', against: 'field1' };

      const result = service.beforeField(schema, actionObj);
      const field1Index = result.findIndex((f) => f.uid === 'field1');
      const field3Index = result.findIndex((f) => f.uid === 'field3');
      expect(field3Index).to.equal(field1Index - 1);
    });
  });

  describe('getValidated', () => {
    it('should validate that fields exist in schema', () => {
      const schema = [
        { uid: 'field1' },
        { uid: 'field2' },
      ];
      const actionObj = { fieldToMove: 'field1', against: 'field2' };

      const result = service.getValidated(schema, actionObj);
      expect(result.isValid).to.equal(true);
      expect(result.missingField).to.be.null;
    });

    it('should return invalid if fieldToMove does not exist', () => {
      const schema = [{ uid: 'field1' }];
      const actionObj = { fieldToMove: 'nonexistent' };

      const result = service.getValidated(schema, actionObj);
      expect(result.isValid).to.equal(false);
      expect(result.missingField).to.equal('nonexistent');
    });

    it('should return invalid if against field does not exist', () => {
      const schema = [{ uid: 'field1' }];
      const actionObj = { fieldToMove: 'field1', against: 'nonexistent' };

      const result = service.getValidated(schema, actionObj);
      expect(result.isValid).to.equal(false);
      expect(result.missingField).to.equal('nonexistent');
    });
  });

  describe('applyActionsOnFields', () => {
    it('should apply move field actions', (done) => {
      const callsite = createMockCallsite();
      const data = {
        schema: [
          { uid: 'field1' },
          { uid: 'field2' },
          { uid: 'field3' },
        ],
      };

      service.setIdAndAction('blog', actions.EDIT_CT);
      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [],
          },
        },
      });
      service.getActions({ action: 'toTheTop', fieldToMove: 'field3' });

      service.applyActionsOnFields(callsite, data, (err, result) => {
        expect(err).to.be.null;
        expect(result.schema[0].uid).to.equal('field3');
        done();
      });
    });

    it('should handle errors in mergeEditSchema', (done) => {
      const callsite = createMockCallsite();
      const data = { schema: [{ uid: 'field1' }] };

      service.setIdAndAction('blog', actions.EDIT_CT);
      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [{ uid: 'nonexistent', isEdit: true }],
          },
        },
      });

      service.applyActionsOnFields(callsite, data, (err) => {
        expect(err).to.exist;
        done();
      });
    });

    it('should return data if no move actions', (done) => {
      const callsite = createMockCallsite();
      const data = { schema: [{ uid: 'field1' }] };

      service.setIdAndAction('blog', actions.EDIT_CT);
      _map.set('blog', mapInstance, {
        [actions.EDIT_CT]: {
          content_type: {
            schema: [],
          },
        },
      });

      service.applyActionsOnFields(callsite, data, (err, result) => {
        expect(err).to.be.null;
        expect(result).to.deep.equal(data);
        done();
      });
    });
  });
});
