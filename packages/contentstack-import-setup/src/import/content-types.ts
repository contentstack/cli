import * as chalk from 'chalk';
import { log, fsUtil } from '../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../types';
import ExtensionImportSetup from './extensions';

export default class ContentTypesImportSetup {
  private config: ImportConfig;
  private contentTypeFilePath: string;
  private stackAPIClient: ModuleClassParams['stackAPIClient'];
  private dependencies: ModuleClassParams['dependencies'];
  private contentTypeConfig: ImportConfig['modules']['content-types'];

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    this.config = config;
    this.stackAPIClient = stackAPIClient;
    this.dependencies = dependencies;
    this.contentTypeConfig = config.modules['content-types'];
  }

  /**
   *
   */
  async start() {
    try {
      // in content type we need to create mappers for marketplace apps, extension, taxonomies
      // we can call the specific import setup for each of these modules
      // Call the specific import setup for each module
      // todo
      // await this.importMarketplaceApps();
      await new ExtensionImportSetup({
        config: this.config,
        dependencies: this.dependencies,
        stackAPIClient: this.stackAPIClient,
      }).start();

      // todo
      // await this.importTaxonomies();

      log(this.config, chalk.green(`Mapper file created`), 'success');
    } catch (error) {
      log(this.config, chalk.red(`Error generating ${error.message}`), 'error');
    }
  }
}
