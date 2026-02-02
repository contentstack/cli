import { expect } from 'chai';
import { getUid, getMandatoryVal, getUniqueVal, getFieldMetaData, getSchema } from '../../../src/utils/schema-helper';
import { actions } from '../../../src/utils/constants';

describe('Schema Helper', () => {
  describe('getUid', () => {
    it('should convert string to lowercase with underscores', () => {
      expect(getUid('Test Field Name')).to.equal('test_field_name');
    });

    it('should handle single word', () => {
      expect(getUid('Title')).to.equal('title');
    });

    it('should handle multiple spaces', () => {
      expect(getUid('Test   Field')).to.equal('test___field');
    });
  });

  describe('getMandatoryVal', () => {
    it('should return true for title', () => {
      expect(getMandatoryVal('title')).to.be.true;
    });

    it('should return true for url', () => {
      expect(getMandatoryVal('url')).to.be.true;
    });

    it('should return false for other fields', () => {
      expect(getMandatoryVal('author')).to.be.false;
    });

    it('should be case insensitive', () => {
      expect(getMandatoryVal('TITLE')).to.be.true;
      expect(getMandatoryVal('URL')).to.be.true;
    });
  });

  describe('getUniqueVal', () => {
    it('should return true for title', () => {
      expect(getUniqueVal('title')).to.be.true;
    });

    it('should return true for url', () => {
      expect(getUniqueVal('url')).to.be.true;
    });

    it('should return false for other fields', () => {
      expect(getUniqueVal('author')).to.be.false;
    });
  });

  describe('getFieldMetaData', () => {
    it('should return metadata object with _default and version', () => {
      const result = getFieldMetaData('title');
      expect(result).to.have.property('_default');
      expect(result).to.have.property('version');
    });

    it('should set _default based on field name', () => {
      expect(getFieldMetaData('title')._default).to.be.true;
      expect(getFieldMetaData('author')._default).to.be.false;
    });
  });

  describe('getSchema', () => {
    it('should create schema with default values', () => {
      const schema = getSchema('Test Field', undefined);
      expect(schema).to.have.property('display_name', 'Test Field');
      expect(schema).to.have.property('uid', 'test_field');
      expect(schema).to.have.property('data_type');
      expect(schema).to.have.property('mandatory');
      expect(schema).to.have.property('unique');
      expect(schema).to.have.property('field_metadata');
      expect(schema).to.have.property('non_localizable', false);
      expect(schema).to.have.property('isDelete', false);
      expect(schema).to.have.property('isEdit', false);
    });

    it('should set isDelete to true when subAction is DELETE_FIELD', () => {
      const schema = getSchema('Test Field', actions.DELETE_FIELD);
      expect(schema.isDelete).to.be.true;
      expect(schema.isEdit).to.be.false;
    });

    it('should set isEdit to true when subAction is EDIT_FIELD', () => {
      const schema = getSchema('Test Field', actions.EDIT_FIELD);
      expect(schema.isEdit).to.be.true;
      expect(schema.isDelete).to.be.false;
    });
  });
});
