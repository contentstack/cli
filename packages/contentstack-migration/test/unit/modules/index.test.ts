import { expect } from 'chai';
import * as modulesIndex from '../../../src/modules/index';

describe('Modules Index', () => {
  it('should export ContentType, Field, Migration, and Parser', () => {
    expect(modulesIndex.ContentType).to.exist;
    expect(modulesIndex.Field).to.exist;
    expect(modulesIndex.Migration).to.exist;
    expect(modulesIndex.Parser).to.exist;
  });
});
