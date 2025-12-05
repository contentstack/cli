import * as chalk from 'chalk';
import { fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

export default class GlobalFieldsImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.initializeContext('global-fields');
  }

  async start() {
    try {
      await this.setupDependencies();
      log.success(`The required setup files for global fields have been generated successfully.`);
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error occurred while generating the global field mapper');
    }
  }
}
