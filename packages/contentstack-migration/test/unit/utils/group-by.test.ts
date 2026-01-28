import { expect } from 'chai';
import groupBy from '../../../src/utils/group-by';

describe('Group By', () => {
  it('should return empty object for null data', () => {
    const result = groupBy(null, 'field');
    expect(result).to.deep.equal({});
  });

  it('should group array by field', () => {
    const data = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'A', value: 3 },
    ];
    const result = groupBy(data, 'category');
    expect(result).to.have.property('A');
    expect(result).to.have.property('B');
    expect(result.A).to.have.length(2);
    expect(result.B).to.have.length(1);
  });

  it('should handle single item array', () => {
    const data = [{ category: 'A', value: 1 }];
    const result = groupBy(data, 'category');
    expect(result).to.have.property('A');
    expect(result.A).to.have.length(1);
  });

  it('should handle nested objects', () => {
    const data = [
      { nested: { category: 'A' }, value: 1 },
      { nested: { category: 'B' }, value: 2 },
    ];
    const result = groupBy(data, 'category');
    expect(result).to.have.property('A');
    expect(result).to.have.property('B');
  });

  it('should handle empty array', () => {
    const result = groupBy([], 'field');
    expect(result).to.deep.equal({});
  });
});
