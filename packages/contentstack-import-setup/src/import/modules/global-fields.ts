import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';

export default class GlobalFieldsImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
  }

  async start() {
    try {
      await this.setupDependencies();
      log(this.config, `The required setup files for global fields have been generated successfully.`, 'success');
    } catch (error) {
      log(this.config, `Error occurred while generating the global field mapper: ${error.message}.`, 'error');
    }
  }
}
