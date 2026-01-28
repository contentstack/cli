import { expect } from 'chai';
import Parser from '../../../src/modules/parser';

describe('Parser Module', () => {
  it('should export Parser class', () => {
    expect(Parser).to.exist;
  });
});
