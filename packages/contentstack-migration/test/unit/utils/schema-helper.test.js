'use strict';

const { expect } = require('chai');
const schemaHelper = require('../../../src/utils/schema-helper');
const { actions } = require('../../../src/utils/constants');

describe('Schema Helper', () => {
  describe('getUid', () => {
    it('should convert string to lowercase with underscores', () => {
      expect(schemaHelper.getUid('Test Field Name')).to.equal('test_field_name');
      expect(schemaHelper.getUid('My Field')).to.equal('my_field');
      expect(schemaHelper.getUid('simple')).to.equal('simple');
    });

    it('should handle single word', () => {
      expect(schemaHelper.getUid('Title')).to.equal('title');
    });
  });

  describe('getMandatoryVal', () => {
    it('should return true for title field', () => {
      expect(schemaHelper.getMandatoryVal('title')).to.be.true;
      expect(schemaHelper.getMandatoryVal('Title')).to.be.true;
      expect(schemaHelper.getMandatoryVal('TITLE')).to.be.true;
    });

    it('should return true for url field', () => {
      expect(schemaHelper.getMandatoryVal('url')).to.be.true;
      expect(schemaHelper.getMandatoryVal('Url')).to.be.true;
      expect(schemaHelper.getMandatoryVal('URL')).to.be.true;
    });

    it('should return false for other fields', () => {
      expect(schemaHelper.getMandatoryVal('author')).to.be.false;
      expect(schemaHelper.getMandatoryVal('description')).to.be.false;
    });
  });

  describe('getUniqueVal', () => {
    it('should return true for title field', () => {
      expect(schemaHelper.getUniqueVal('title')).to.be.true;
      expect(schemaHelper.getUniqueVal('Title')).to.be.true;
    });

    it('should return true for url field', () => {
      expect(schemaHelper.getUniqueVal('url')).to.be.true;
      expect(schemaHelper.getUniqueVal('Url')).to.be.true;
    });

    it('should return false for other fields', () => {
      expect(schemaHelper.getUniqueVal('author')).to.be.false;
    });
  });

  describe('getFieldMetaData', () => {
    it('should return metadata object with default and version', () => {
      const metadata = schemaHelper.getFieldMetaData('title');
      expect(metadata).to.be.an('object');
      expect(metadata._default).to.be.true;
      expect(metadata.version).to.exist;
    });

    it('should set _default based on field name', () => {
      const titleMetadata = schemaHelper.getFieldMetaData('title');
      const authorMetadata = schemaHelper.getFieldMetaData('author');
      expect(titleMetadata._default).to.be.true;
      expect(authorMetadata._default).to.be.false;
    });
  });

  describe('getSchema', () => {
    it('should create schema for new field', () => {
      const schema = schemaHelper.getSchema('author', null);
      expect(schema).to.be.an('object');
      expect(schema.uid).to.equal('author');
      expect(schema.display_name).to.equal('author');
      expect(schema.isDelete).to.be.false;
      expect(schema.isEdit).to.be.false;
    });

    it('should create schema with isEdit flag for edit action', () => {
      const schema = schemaHelper.getSchema('author', actions.EDIT_FIELD);
      expect(schema.isEdit).to.be.true;
      expect(schema.isDelete).to.be.false;
    });

    it('should create schema with isDelete flag for delete action', () => {
      const schema = schemaHelper.getSchema('author', actions.DELETE_FIELD);
      expect(schema.isDelete).to.be.true;
      expect(schema.isEdit).to.be.false;
    });

    it('should set mandatory and unique for title field', () => {
      const schema = schemaHelper.getSchema('title', null);
      expect(schema.mandatory).to.be.true;
      expect(schema.unique).to.be.true;
    });

    it('should set mandatory and unique for url field', () => {
      const schema = schemaHelper.getSchema('url', null);
      expect(schema.mandatory).to.be.true;
      expect(schema.unique).to.be.true;
    });

    it('should include field_metadata', () => {
      const schema = schemaHelper.getSchema('author', null);
      expect(schema.field_metadata).to.be.an('object');
      expect(schema.field_metadata.version).to.exist;
    });
  });
});
