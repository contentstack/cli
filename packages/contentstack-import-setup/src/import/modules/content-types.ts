import * as chalk from 'chalk';
import { fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import ExtensionImportSetup from './extensions';
import BaseImportSetup from './base-setup';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

export default class ContentTypesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.initializeContext('content-types');
  }

  async start() {
    try {
      await this.setupDependencies();
      log.success(`The required setup files for content types have been generated successfully.`);
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error occurred while generating the content type mapper');
    }
  }
}