import { ExportProjects, ExportExperiences } from '@contentstack/cli-variants';

import BaseClass from './base-class';
import { log, formatError, fsUtil } from '../../utils';
import { LabelConfig, ModuleClassParams, ExportConfig,  } from '../../types';
import { ContentstackClient } from '@contentstack/cli-utilities';

export default class ExportEclipse {
  public exportConfig: ExportConfig;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
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
            // export events
            // export attributes
            // export audiences
            // export experiences, along with this export content type details as well
            log(this.exportConfig, 'Starting personalization project export', 'info');
            new ExportExperiences(this.exportConfig).start();
          } 
    } catch (error) {
      log(this.exportConfig, `Failed to export Personalization project. ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    }
  }
}
