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
      log(this.config, `The required setup files for content types have been generated successfully.`, 'success');
    } catch (error) {
      log(this.config, `Error occurred while generating the content type mapper: ${error.message}.`, 'error');
    }
  }
}