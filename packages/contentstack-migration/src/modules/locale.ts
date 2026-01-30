// Service
import { LocaleService } from '../services';

// Config
import { masterLocale } from '../config';

// Utils
import { safePromise } from '../utils';

export default class Locale {
  localeService: LocaleService;

  constructor() {
    this.localeService = new LocaleService();
  }

  async fetchLocales(callback?: (err: Error | null, result: any) => void): Promise<any> {
    let { master_locale } = masterLocale;

    let { localeService } = this;
    let [err, result] = await safePromise(localeService.getLocale());

    if (err) throw new Error(err as any);

    // Use default code, if no result is found
    result = result.length ? result : [master_locale];

    if (callback) return callback(null, result);
    return result;
  }
}
