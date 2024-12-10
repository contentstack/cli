import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import ExtensionImportSetup from './extensions';
import BaseImportSetup from './base-setup';

export default class ContentTypesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
  }

  async start() {
    try {
      await this.setupDependencies();
      log(this.config, `Generate required setup files for content types`, 'success');
    } catch (error) {
      log(this.config, `Error generating ${error.message}`, 'error');
    }
  }
}
