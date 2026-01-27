import { expect } from 'chai';
import * as actionsIndex from '../../../src/actions/index';
import { actions } from '../../../src/utils/constants';

describe('Actions Index', () => {
  let mockCallsite: any;

  beforeEach(() => {
    mockCallsite = {
      getFileName: () => '/test/file.js',
      getLineNumber: () => 10,
    };
  });

  it('should export actionCreators', () => {
    expect(actionsIndex.actionCreators).to.exist;
    expect(actionsIndex.actionCreators).to.be.an('object');
  });

  describe('customTasks', () => {
    it('should create custom task action', () => {
      const result = actionsIndex.actionCreators.customTasks(mockCallsite, { key: 'value' });
      expect(result).to.have.property('type', 'customTask');
      expect(result).to.have.property('meta');
      expect(result.meta.callsite).to.have.property('file', '/test/file.js');
      expect(result.meta.callsite).to.have.property('line', 10);
      expect(result.payload).to.have.property('action', actions.CUSTOM_TASK);
    });
  });

  describe('contentType.create', () => {
    it('should create content type action', () => {
      const result = actionsIndex.actionCreators.contentType.create(mockCallsite, 'test-id', { title: 'Test' });
      expect(result).to.have.property('type', 'create');
      expect(result.payload).to.have.property('contentTypeId', 'test-id');
      expect(result.payload).to.have.property('action', actions.CREATE_CT);
    });
  });

  describe('contentType.edit', () => {
    it('should create edit content type action', () => {
      const result = actionsIndex.actionCreators.contentType.edit(mockCallsite, 'test-id', { title: 'Test' });
      expect(result).to.have.property('type', 'edit');
      expect(result.payload).to.have.property('action', actions.EDIT_CT);
    });
  });

  describe('contentType.transformEntries', () => {
    it('should create transformEntries action', () => {
      const result = actionsIndex.actionCreators.contentType.transformEntries(mockCallsite, 'test-id', {});
      expect(result).to.have.property('type', 'transformEntries');
    });
  });

  describe('contentType.deriveLinkedEntries', () => {
    it('should create deriveLinkedEntries action', () => {
      const result = actionsIndex.actionCreators.contentType.deriveLinkedEntries(mockCallsite, 'test-id', {});
      expect(result).to.have.property('type', 'deriveLinkedEntries');
    });
  });

  describe('contentType.transformEntriesToType', () => {
    it('should create transformEntriesToType action', () => {
      const result = actionsIndex.actionCreators.contentType.transformEntriesToType(mockCallsite, 'test-id', {});
      expect(result).to.have.property('type', 'transformEntriesToType');
    });
  });

  describe('contentType.typeError', () => {
    it('should create typeError action', () => {
      const result = actionsIndex.actionCreators.contentType.typeError(mockCallsite, 'test-id', { typeErrors: ['error'] });
      expect(result).to.have.property('type', 'typeError');
      expect(result.payload).to.have.property('typeErrors');
      expect(result.payload.typeErrors).to.deep.equal(['error']);
    });
  });

  describe('contentType.apiError', () => {
    it('should create apiError action', () => {
      const result = actionsIndex.actionCreators.contentType.apiError(mockCallsite, 'test-id', { error: 'test' });
      expect(result).to.have.property('type', 'apiError');
      expect(result.payload).to.have.property('apiError');
    });
  });

  describe('contentType.field', () => {
    it('should create field action', () => {
      const result = actionsIndex.actionCreators.contentType.field(mockCallsite, 'test-id', { field: 'test' });
      expect(result).to.have.property('type', 'field');
      expect(result.payload).to.have.property('field');
    });
  });
});
