import { expect } from 'chai';
import defaultOptions from '../../../src/config/default-options';

describe('Default Options', () => {
  it('should export default options object', () => {
    expect(defaultOptions).to.exist;
    expect(defaultOptions).to.be.an('object');
  });

  it('should have is_page property set to false', () => {
    expect(defaultOptions).to.have.property('is_page', false);
  });

  it('should have singleton property set to false', () => {
    expect(defaultOptions).to.have.property('singleton', false);
  });
});
