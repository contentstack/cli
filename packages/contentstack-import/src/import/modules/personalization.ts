import { Import, LogType } from '@contentstack/cli-variants';

import { log } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalization {
  private config: ImportConfig;
  public personalization: ImportConfig['modules']['personalization'];

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
    this.personalization = importConfig.modules.personalization;
  }

  /**
   * The `start` function in TypeScript asynchronously imports data based on a specified order using a
   * module mapper.
   */
  async start(): Promise<void> {
    try {
      if (this.personalization.importData) {
        const moduleMapper = {
          events: Import.Events,
          projects: Import.Project,
          audiences: Import.Audiences,
          attributes: Import.Attribute,
          experiences: Import.Experiences,
        };

        const order: (keyof typeof moduleMapper)[] = this.personalization.importOrder as (keyof typeof moduleMapper)[];

        for (const module of order) {
          const Module = moduleMapper[module];
          if (!this.personalization.importData && Module.name !== 'Project') break;
          await new Module(this.config, log as unknown as LogType).import();
        }
      }
    } catch (error) {
      this.config.modules.personalization.importData = false; // Stop personalization import if project creation fails
      log(this.config, error, 'error');
      if (!this.personalization.importData) {
        log(this.config, 'Skipping personalization migration...', 'warn');
      }
    }
  }
}