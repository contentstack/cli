import { expect } from 'chai';
import masterLocale from '../../../src/config/master-locale';

describe('Master Locale', () => {
  it('should export masterLocale object', () => {
    expect(masterLocale).to.exist;
    expect(masterLocale).to.be.an('object');
  });

  it('should have master_locale property', () => {
    expect(masterLocale).to.have.property('master_locale');
  });

  it('should have master_locale with name and code', () => {
    expect(masterLocale.master_locale).to.have.property('name', 'English - United States');
    expect(masterLocale.master_locale).to.have.property('code', 'en-us');
  });
});
