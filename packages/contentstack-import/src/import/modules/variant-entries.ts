import { Import, ImportHelperMethodsConfig, LogType } from '@contentstack/cli-variants';

import { ImportConfig, ModuleClassParams } from '../../types';
import { log, lookUpTerms, lookupAssets, lookupEntries, lookupExtension, restoreJsonRteEntryRefs } from '../../utils';

export default class ImportVarientEntries {
  private config: ImportConfig;
  public personalization: ImportConfig['modules']['personalization'];

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
    this.personalization = importConfig.modules.personalization;
  }

  /**
   * The `start` function in TypeScript is an asynchronous method that conditionally imports data using
   * helper methods and logs any errors encountered.
   */
  async start(): Promise<void> {
    try {
      if (this.personalization.importData) {
        const helpers: ImportHelperMethodsConfig = {
          lookUpTerms,
          lookupAssets,
          lookupEntries,
          lookupExtension,
          restoreJsonRteEntryRefs,
        };
        await new Import.VariantEntries(Object.assign(this.config, { helpers }, log as unknown as LogType)).import();
      }
    } catch (error) {
      log(this.config, error, 'error');
    }
  }
}
