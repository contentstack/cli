import { expect } from 'chai';
import { gfSchemaTemplate } from '../../../src/utils/global-field-helper';

describe('Global Field Helper', () => {
  describe('gfSchemaTemplate', () => {
    it('should export a schema template object', () => {
      expect(gfSchemaTemplate).to.be.an('object');
      expect(gfSchemaTemplate).to.have.property('global_field');
    });

    it('should have correct structure for global_field', () => {
      const globalField = gfSchemaTemplate.global_field;
      
      expect(globalField).to.be.an('object');
      expect(globalField).to.have.property('title', 'Seed');
      expect(globalField).to.have.property('uid', '');
      expect(globalField).to.have.property('schema');
      expect(globalField).to.have.property('description', '');
    });

    it('should have schema as an array', () => {
      const schema = gfSchemaTemplate.global_field.schema;
      
      expect(schema).to.be.an('array');
      expect(schema).to.have.lengthOf(1);
    });

    it('should have correct structure for first schema field', () => {
      const firstField = gfSchemaTemplate.global_field.schema[0];
      
      expect(firstField).to.be.an('object');
      expect(firstField).to.have.property('display_name', 'Title');
      expect(firstField).to.have.property('uid', 'title');
      expect(firstField).to.have.property('data_type', 'text');
      expect(firstField).to.have.property('field_metadata');
      expect(firstField).to.have.property('unique', false);
      expect(firstField).to.have.property('mandatory', true);
      expect(firstField).to.have.property('multiple', false);
    });

    it('should have correct field_metadata structure', () => {
      const fieldMetadata = gfSchemaTemplate.global_field.schema[0].field_metadata;
      
      expect(fieldMetadata).to.be.an('object');
      expect(fieldMetadata).to.have.property('_default', true);
    });
  });
});
