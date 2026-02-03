import { expect } from 'chai';
import { getEntryObj } from '../../../src/utils/object-helper';

describe('Object Helper', () => {
  describe('getEntryObj', () => {
    it('should extract specified fields from object', () => {
      const obj = { field1: 'value1', field2: 'value2', field3: 'value3' };
      const fields = ['field1', 'field3'];
      const result = getEntryObj(fields, obj);
      expect(result).to.deep.equal({ field1: 'value1', field3: 'value3' });
    });

    it('should return empty object when fields array is empty', () => {
      const obj = { field1: 'value1' };
      const result = getEntryObj([], obj);
      expect(result).to.deep.equal({});
    });

    it('should handle missing fields gracefully', () => {
      const obj = { field1: 'value1' };
      const fields = ['field1', 'missingField'];
      const result = getEntryObj(fields, obj);
      expect(result).to.deep.equal({ field1: 'value1', missingField: undefined });
    });

    it('should handle all fields', () => {
      const obj = { field1: 'value1', field2: 'value2' };
      const fields = ['field1', 'field2'];
      const result = getEntryObj(fields, obj);
      expect(result).to.deep.equal(obj);
    });
  });
});
