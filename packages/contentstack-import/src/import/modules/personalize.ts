import { Import } from '@contentstack/cli-variants';
import { log } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalize {
  private config: ImportConfig;
  public personalizeConfig: ImportConfig['modules']['personalize'];

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
    this.personalizeConfig = importConfig.modules.personalize;
  }

  /**
   * The `start` function in TypeScript asynchronously imports data based on a specified order using a
   * module mapper.
   */
  async start(): Promise<void> {
    try {
      if (!this.personalizeConfig.baseURL[this.config.region.name]) {
        log(this.config, 'Skipping Personalize project import, personalize url is not set', 'info');
        this.personalizeConfig.importData = false;
        return;
      }

      if (this.config.management_token) {
        log(this.config, 'Skipping Personalize project import when using management token', 'info');
        return;
      }
      await new Import.Project(this.config).import();
      if (this.personalizeConfig.importData) {
        const moduleMapper = {
          events: Import.Events,
          audiences: Import.Audiences,
          attributes: Import.Attribute,
          experiences: Import.Experiences,
        };

        const order: (keyof typeof moduleMapper)[] = this.personalizeConfig
          .importOrder as (keyof typeof moduleMapper)[];

        for (const module of order) {
          const Module = moduleMapper[module];
          await new Module(this.config).import();
        }
      }
    } catch (error) {
      this.personalizeConfig.importData = false; // Stop personalize import if project creation fails
      log(this.config, error, 'error');
      if (!this.personalizeConfig.importData) {
        log(this.config, 'Skipping personalize migration...', 'warn');
      }
    }
  }
}
