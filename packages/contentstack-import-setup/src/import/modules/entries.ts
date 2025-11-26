import { ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

export default class EntriesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.initializeContext('entries');
  }

  async start() {
    try {
      await this.setupDependencies();
      log.success(`The required setup files for entries have been generated successfully.`);
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error occurred while generating the entry mapper');
    }
  }
}
