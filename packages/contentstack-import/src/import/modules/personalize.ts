import { Import } from '@contentstack/cli-variants';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalize {
  private config: ImportConfig;
  public personalizeConfig: ImportConfig['modules']['personalize'];

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
    this.config.context.module = 'personalize';
    this.personalizeConfig = importConfig.modules.personalize;
  }

  /**
   * The `start` function in TypeScript asynchronously imports data based on a specified order using a
   * module mapper.
   */
  async start(): Promise<void> {
    try {
      if (!this.personalizeConfig.baseURL[this.config.region.name]) {
        log.debug(`No baseURL found for region: ${this.config.region.name}`, this.config.context);
        log.info('Skipping Personalize project import, personalize url is not set', this.config.context);
        this.personalizeConfig.importData = false;
        return;
      }

      if (this.config.management_token) {
        log.debug('Management token detected, skipping personalize import', this.config.context);
        log.info('Skipping Personalize project import when using management token', this.config.context);
        return;
      }

      log.debug('Starting personalize project import', this.config.context);
      log.debug(`Base URL: ${this.personalizeConfig.baseURL[this.config.region.name]}`, this.config.context);
      await new Import.Project(this.config).import();
      log.debug('Personalize project import completed', this.config.context);

      if (this.personalizeConfig.importData) {
        log.debug('Personalize data import is enabled', this.config.context);

        const moduleMapper = {
          events: Import.Events,
          audiences: Import.Audiences,
          attributes: Import.Attribute,
          experiences: Import.Experiences,
        };

        const order: (keyof typeof moduleMapper)[] = this.personalizeConfig
          .importOrder as (keyof typeof moduleMapper)[];

        log.debug(`Processing ${order.length} personalize modules in order: ${order.join(', ')}`, this.config.context);
        const moduleTypes = Object.keys(moduleMapper || {}).join(', ');
        log.debug(`Available module types: ${moduleTypes}`, this.config.context);

        for (const module of order) {
          log.debug(`Starting import for personalize module: ${module}`, this.config.context);
          const Module = moduleMapper[module];

          if (!Module) {
            log.debug(`Module ${module} not found in moduleMapper`, this.config.context);
            continue;
          }

          log.debug(`Creating instance of ${module} module`, this.config.context);
          const moduleInstance = new Module(this.config);

          log.debug(`Importing ${module} module`, this.config.context);
          await moduleInstance.import();

          log.success(`Successfully imported personalize module: ${module}`, this.config.context);
          log.debug(`Completed import for personalize module: ${module}`, this.config.context);
        }

        log.debug('All personalize modules imported successfully', this.config.context);
      } else {
        log.debug('Personalize data import is disabled', this.config.context);
      }

      log.success('Personalize import completed successfully', this.config.context);
    } catch (error) {
      this.personalizeConfig.importData = false; // Stop personalize import if project creation fails
      handleAndLogError(error, { ...this.config.context });
      if (!this.personalizeConfig.importData) {
        log.debug('Personalize import data flag set to false due to error', this.config.context);
        log.info('Skipping personalize migration...', this.config.context);
      }
    }
  }
}
