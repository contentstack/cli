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
        await new ExportExperiences(this.exportConfig).start();
        await new ExportEvents(this.exportConfig).start();
        await new ExportAudiences(this.exportConfig).start();
        await new ExportAttributes(this.exportConfig).start();
      } else {
        log(this.exportConfig, 'No Personalization project linked with the stack', 'info');
      }
    } catch (error) {
      this.exportConfig.personalizationEnabled = false;
      log(this.exportConfig, `Failed to export Personalization project. ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
