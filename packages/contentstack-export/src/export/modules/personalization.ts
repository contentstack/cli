import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
} from '@contentstack/cli-variants';

import { log, formatError } from '../../utils';
import { ModuleClassParams, ExportConfig } from '../../types';

export default class ExportPersonalization {
  public exportConfig: ExportConfig;
  constructor({ exportConfig }: ModuleClassParams) {
    this.exportConfig = exportConfig;
  }

  async start(): Promise<void> {
    try {
      await new ExportProjects(this.exportConfig).start();
      if (this.exportConfig.personalizationEnabled) {
        const moduleMapper = {
          events: new ExportEvents(this.exportConfig),
          attributes: new ExportAttributes(this.exportConfig),
          audiences: new ExportAudiences(this.exportConfig),
          experiences: new ExportExperiences(this.exportConfig),
        };

        const order: (keyof typeof moduleMapper)[] = this.exportConfig.modules.personalization
          .exportOrder as (keyof typeof moduleMapper)[];

        for (const module of order) {
          if (moduleMapper[module]) {
            await moduleMapper[module].start();
          } else {
            log(this.exportConfig, `No implementation found for the module ${module}`, 'info');
          }
        }
      }
    } catch (error) {
      this.exportConfig.personalizationEnabled = false;
      log(this.exportConfig, error, 'error');
    }
  }
}
