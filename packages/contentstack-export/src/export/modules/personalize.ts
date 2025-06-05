import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
  AnyProperty,
} from '@contentstack/cli-variants';
import { handleAndLogError, messageHandler, v2Logger } from '@contentstack/cli-utilities';

import { ModuleClassParams, ExportConfig } from '../../types';

export default class ExportPersonalize {
  public exportConfig: ExportConfig;
  public personalizeConfig: { dirName: string; baseURL: Record<string, string> } & AnyProperty;
  constructor({ exportConfig }: ModuleClassParams) {
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.exportConfig.context.module = 'personalize';
  }

  async start(): Promise<void> {
    try {
      if (!this.personalizeConfig.baseURL[this.exportConfig.region.name]) {
        v2Logger.info(messageHandler.parse('PERSONALIZE_URL_NOT_SET'), this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      if (this.exportConfig.management_token) {
        v2Logger.info(messageHandler.parse('PERSONALIZE_SKIPPING_WITH_MANAGEMENT_TOKEN'), this.exportConfig.context);
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
            v2Logger.info(
              messageHandler.parse('PERSONALIZE_MODULE_NOT_IMPLEMENTED', module),
              this.exportConfig.context,
            );
          }
        }
      }
    } catch (error) {
      if (error === 'Forbidden') {
        v2Logger.info(messageHandler.parse('PERSONALIZE_NOT_ENABLED'), this.exportConfig.context);
      } else {
        handleAndLogError(error, { ...this.exportConfig.context });
      }
      this.exportConfig.personalizationEnabled = false;
    }
  }
}
