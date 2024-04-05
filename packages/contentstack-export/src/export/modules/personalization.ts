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
      // get project details
      // if project exist
      // set that in the global config
      // export project
      const projectHandler = new ExportProjects(this.exportConfig);
      await projectHandler.start();
      if (this.exportConfig.personalizationEnabled) {
        // export experiences, along with this export content type details as well
        await new ExportExperiences(this.exportConfig).start();
        await new ExportEvents(this.exportConfig).start();
        await new ExportAudiences(this.exportConfig).start();
        await new ExportAttributes(this.exportConfig).start();
      }
    } catch (error) {
      this.exportConfig.personalizationEnabled = false;
      log(this.exportConfig, `Failed to export Personalization project. ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
