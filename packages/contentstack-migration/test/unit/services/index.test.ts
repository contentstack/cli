import { expect } from 'chai';
import * as servicesIndex from '../../../src/services/index';

describe('Services Index', () => {
  it('should export ContentTypeService and LocaleService', () => {
    expect(servicesIndex.ContentTypeService).to.exist;
    expect(servicesIndex.LocaleService).to.exist;
  });
});
