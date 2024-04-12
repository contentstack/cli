import { Import } from '@contentstack/cli-variants';

import { log } from '../../utils';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalization {
  private config: ImportConfig;
  public personalization: ImportConfig['modules']['personalization'];

  constructor({ importConfig }: ModuleClassParams) {
    this.personalization = importConfig.modules.personalization;
    this.config = importConfig;
  }

  /**
   * The `start` function in TypeScript asynchronously imports data based on a specified order using a
   * module mapper.
   */
  async start(): Promise<void> {
    try {
      if (this.personalization.importData) {
        const moduleMapper = {
          projects: Import.Project,
          attributes: Import.Attribute,
          audiences: Import.Audiences,
          experiences: Import.Experiences
        };

        const order: (keyof typeof moduleMapper)[] = this.personalization.importOrder as (keyof typeof moduleMapper)[];

        for (const module of order) {
          const Module = moduleMapper[module];
          await new Module(this.config).import();
        }
      }
    } catch (error) {
      log(this.config, error, 'error');
    }
  }
}
