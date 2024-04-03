import { Import } from '@contentstack/cli-variants';

import { log } from '../..//utils';
import { ImportConfig } from '../../types';

export default class ImportPersonalization {
  public readonly personalization: ImportConfig['modules']['personalization'];

  constructor(public readonly config: ImportConfig) {
    this.personalization = this.config.modules.personalization;
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
