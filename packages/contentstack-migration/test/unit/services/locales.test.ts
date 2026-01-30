import { expect } from 'chai';
import { createSandbox, SinonStub } from 'sinon';
import LocaleService from '../../../src/services/locales';
import * as mapModule from '../../../src/utils/map';
import * as utilsModule from '../../../src/utils';

describe('Locales Service', () => {
  let sandbox: ReturnType<typeof createSandbox>;
  let service: LocaleService;
  let safePromiseStub: SinonStub;
  let mockMapInstance: Map<string, any>;
  let mockStackSDK: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockMapInstance = new Map();
    mockStackSDK = {
      locale: sandbox.stub().returns({
        query: sandbox.stub().returns({
          find: sandbox.stub().resolves({
            items: [
              { code: 'en-us', name: 'English', fallback_locale: null },
              { code: 'es-es', name: 'Spanish', fallback_locale: 'en-us' },
            ],
          }),
        }),
      }),
    };

    sandbox.stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    sandbox.stub(mapModule, 'get').callsFake((key: string, mapInstance: Map<string, any>, data?: any) => {
      if (key === 'MANAGEMENT_SDK') {
        const existing = mapInstance.get(key);
        if (existing !== undefined) return existing;
        mapInstance.set(key, mockStackSDK);
        return mockStackSDK;
      }
      const existing = mapInstance.get(key);
      if (existing !== undefined) return existing;
      const defaultValue = data !== undefined ? data : undefined;
      if (defaultValue !== undefined) {
        mapInstance.set(key, defaultValue);
      }
      return defaultValue;
    });
    safePromiseStub = sandbox.stub(utilsModule, 'safePromise').callsFake(async (promise: any) => {
      try {
        const result = await promise;
        return [null, result];
      } catch (err) {
        return [err, null];
      }
    });

    service = new LocaleService();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should export LocaleService class', () => {
    expect(LocaleService).to.exist;
  });

  it('should be instantiable', () => {
    expect(service).to.be.instanceOf(LocaleService);
  });


  describe('getOrderedResult', () => {
    it('should return ordered locales with fallback locale before dependent locale', () => {
      const result = {
        items: [
          { code: 'es-es', name: 'Spanish', fallback_locale: 'en-us' },
          { code: 'en-us', name: 'English', fallback_locale: null },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered[0].code).to.equal('en-us');
      expect(ordered[1].code).to.equal('es-es');
    });

    it('should handle multiple fallback levels', () => {
      const result = {
        items: [
          { code: 'fr-fr', name: 'French', fallback_locale: 'es-es' },
          { code: 'es-es', name: 'Spanish', fallback_locale: 'en-us' },
          { code: 'en-us', name: 'English', fallback_locale: null },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered[0].code).to.equal('en-us');
      expect(ordered[1].code).to.equal('es-es');
      expect(ordered[2].code).to.equal('fr-fr');
    });

    it('should handle locales without fallback', () => {
      const result = {
        items: [
          { code: 'en-us', name: 'English', fallback_locale: null as any },
          { code: 'de-de', name: 'German', fallback_locale: null as any },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered).to.have.length(2);
      expect(ordered.map((l: any) => l.code)).to.include('en-us');
      expect(ordered.map((l: any) => l.code)).to.include('de-de');
    });

    it('should handle already sorted locales', () => {
      const result = {
        items: [
          { code: 'en-us', name: 'English', fallback_locale: null },
          { code: 'es-es', name: 'Spanish', fallback_locale: 'en-us' },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered[0].code).to.equal('en-us');
      expect(ordered[1].code).to.equal('es-es');
    });

    it('should handle circular fallback references', () => {
      const result = {
        items: [
          { code: 'locale1', name: 'Locale 1', fallback_locale: 'locale2' as any },
          { code: 'locale2', name: 'Locale 2', fallback_locale: 'locale1' as any },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered).to.have.length(2);
    });

    it('should throw error when result is null', () => {
      try {
        service.getOrderedResult(null as any);
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.message).to.equal('Something went wrong.');
      }
    });

    it('should throw error when result.items is missing', () => {
      try {
        service.getOrderedResult({} as any);
        expect.fail('Should have thrown error');
      } catch (err: any) {
        expect(err.message).to.equal('Something went wrong.');
      }
    });

    it('should handle empty items array', () => {
      const result = { items: [] as any[] };
      const ordered = service.getOrderedResult(result);

      expect(ordered).to.be.an('array');
      expect(ordered).to.have.length(0);
    });

    it('should handle complex fallback chain', () => {
      const result = {
        items: [
          { code: 'pt-pt', name: 'Portuguese', fallback_locale: 'es-es' },
          { code: 'fr-fr', name: 'French', fallback_locale: 'en-us' },
          { code: 'es-es', name: 'Spanish', fallback_locale: 'en-us' },
          { code: 'en-us', name: 'English', fallback_locale: null },
        ],
      };

      const ordered = service.getOrderedResult(result);

      expect(ordered[0].code).to.equal('en-us');
      expect(ordered.findIndex((l: any) => l.code === 'es-es')).to.be.lessThan(
        ordered.findIndex((l: any) => l.code === 'pt-pt')
      );
      expect(ordered.findIndex((l: any) => l.code === 'en-us')).to.be.lessThan(
        ordered.findIndex((l: any) => l.code === 'fr-fr')
      );
    });
  });
});
