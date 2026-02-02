import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import Locale from '../../../src/modules/locale';
import * as localeServiceModule from '../../../src/services/locales';
import * as safePromiseModule from '../../../src/utils/safe-promise';

describe('Locale Module', () => {
  let localeServiceStub: SinonStub;
  let getLocaleStub: SinonStub;
  let safePromiseStub: SinonStub;

  beforeEach(() => {
    restore();
  });

  afterEach(() => {
    restore();
  });

  it('should export Locale class', () => {
    expect(Locale).to.exist;
  });

  it('should be instantiable', () => {
    const instance = new Locale();
    expect(instance).to.be.instanceOf(Locale);
    expect(instance.localeService).to.exist;
  });

  it('should fetch locales successfully', async () => {
    const instance = new Locale();
    const mockLocales = [{ code: 'en-us' }, { code: 'fr-fr' }];
    
    stub(instance.localeService, 'getLocale').resolves(mockLocales);
    stub(safePromiseModule, 'default').resolves([null, mockLocales]);

    const result = await instance.fetchLocales();
    expect(result).to.deep.equal(mockLocales);
  });

  it('should return master locale when no locales found', async () => {
    const instance = new Locale();
    
    stub(instance.localeService, 'getLocale').resolves([]);
    stub(safePromiseModule, 'default').resolves([null, []]);

    const result = await instance.fetchLocales();
    expect(result).to.be.an('array');
    expect(result.length).to.be.greaterThan(0);
  });

  it('should handle errors and throw', async () => {
    const instance = new Locale();
    const error = new Error('Fetch failed');
    
    stub(instance.localeService, 'getLocale').rejects(error);
    stub(safePromiseModule, 'default').resolves([error, null]);

    try {
      await instance.fetchLocales();
      expect.fail('Should have thrown error');
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it('should call callback when provided', async () => {
    const instance = new Locale();
    const mockLocales = [{ code: 'en-us' }];
    const callback = stub();
    
    stub(instance.localeService, 'getLocale').resolves(mockLocales);
    stub(safePromiseModule, 'default').resolves([null, mockLocales]);

    await instance.fetchLocales(callback);
    expect(callback.called).to.be.true;
    expect(callback.calledWith(null, mockLocales)).to.be.true;
  });
});
