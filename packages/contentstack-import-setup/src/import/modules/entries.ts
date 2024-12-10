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
      log(this.config, `Generate required setup files for entries`, 'success');
    } catch (error) {
      log(this.config, `Error generating ${error.message}`, 'error');
    }
  }
}
