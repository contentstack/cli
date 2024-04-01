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
        // get project details
        // if project exist
        // set that in the global config
        // export project
        // export events
        // export attributes
        // export audiences
        // export experiences, along with this export content type details as well
      const projectHandler = new ExportProjects(this.exportConfig);
      await projectHandler.start();
      if (this.exportConfig.personalizationEnabled) {
        log(this.exportConfig, 'Starting personalization project export', 'info');
        const projectHandler = new ExportExperiences(this.exportConfig);

      }
    
    }
}
