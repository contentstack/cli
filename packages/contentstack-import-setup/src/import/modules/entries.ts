import { log } from '../../utils';
import { ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';

export default class EntriesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
  }

  async start() {
    try {
      await this.setupDependencies();
      log(this.config, `The required setup files for entries have been generated successfully.`, 'success');
    } catch (error) {
      log(this.config, `Error occurred while generating the entry mapper: ${error.message}.`, 'error');
    }
  }
}
