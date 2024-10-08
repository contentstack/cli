import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
  AnyProperty,
} from '@contentstack/cli-variants';

import { log } from '../../utils';
import { ModuleClassParams, ExportConfig } from '../../types';

export default class ExportPersonalize {
  public exportConfig: ExportConfig;
  public personalizeConfig: { dirName: string; baseURL: Record<string, string> } & AnyProperty;
  constructor({ exportConfig }: ModuleClassParams) {
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
  }

  async start(): Promise<void> {
    try {
      if (!this.personalizeConfig.baseURL[this.exportConfig.region.name]) {
        log(this.exportConfig, 'Skipping Personalize project export, personalize url is not set', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      if (this.exportConfig.management_token) {
        log(this.exportConfig, 'Skipping Personalize project export when using management token', 'info');
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      await new ExportProjects(this.exportConfig).start();
      if (this.exportConfig.personalizationEnabled) {
        const moduleMapper = {
          events: new ExportEvents(this.exportConfig),
          attributes: new ExportAttributes(this.exportConfig),
          audiences: new ExportAudiences(this.exportConfig),
          experiences: new ExportExperiences(this.exportConfig),
        };

        const order: (keyof typeof moduleMapper)[] = this.exportConfig.modules.personalize
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
      if (error === 'Forbidden') {
        log(this.exportConfig, "Personalize is not enabled in the given organization!", 'info');
      } else {
        log(this.exportConfig, error, 'error');
      }
      this.exportConfig.personalizationEnabled = false;
    }
  }
}
