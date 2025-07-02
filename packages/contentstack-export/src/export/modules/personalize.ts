import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
  AnyProperty,
} from '@contentstack/cli-variants';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

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
      log.debug('Starting personalize export process...', this.exportConfig.context);
      
      if (!this.personalizeConfig.baseURL[this.exportConfig.region.name]) {
        log.debug(`Personalize URL not set for region: ${this.exportConfig.region.name}`, this.exportConfig.context);
        log.info(messageHandler.parse('PERSONALIZE_URL_NOT_SET'), this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      
      if (this.exportConfig.management_token) {
        log.debug('Management token detected, skipping personalize export', this.exportConfig.context);
        log.info(messageHandler.parse('PERSONALIZE_SKIPPING_WITH_MANAGEMENT_TOKEN'), this.exportConfig.context);
        this.exportConfig.personalizationEnabled = false;
        return;
      }
      
      log.debug('Starting projects export for personalization...', this.exportConfig.context);
      await new ExportProjects(this.exportConfig).start();
      
      if (this.exportConfig.personalizationEnabled) {
        log.debug('Personalization is enabled, processing personalize modules...', this.exportConfig.context);
        
        const moduleMapper = {
          events: new ExportEvents(this.exportConfig),
          attributes: new ExportAttributes(this.exportConfig),
          audiences: new ExportAudiences(this.exportConfig),
          experiences: new ExportExperiences(this.exportConfig),
        };

        const order: (keyof typeof moduleMapper)[] = this.exportConfig.modules.personalize
          .exportOrder as (keyof typeof moduleMapper)[];

        log.debug(`Personalize export order: ${order.join(', ')}`, this.exportConfig.context);
        
        for (const module of order) {
          log.debug(`Processing personalize module: ${module}`, this.exportConfig.context);
          
          if (moduleMapper[module]) {
            log.debug(`Starting export for module: ${module}`, this.exportConfig.context);
            await moduleMapper[module].start();
            log.debug(`Completed export for module: ${module}`, this.exportConfig.context);
          } else {
            log.debug(`Module not implemented: ${module}`, this.exportConfig.context);
            log.info(
              messageHandler.parse('PERSONALIZE_MODULE_NOT_IMPLEMENTED', module),
              this.exportConfig.context,
            );
          }
        }
        
        log.debug('Completed all personalize module exports', this.exportConfig.context);
      } else {
        log.debug('Personalization is disabled, skipping personalize module exports', this.exportConfig.context);
      }
    } catch (error) {
      if (error === 'Forbidden') {
        log.debug('Personalize access forbidden, personalization not enabled', this.exportConfig.context);
        log.info(messageHandler.parse('PERSONALIZE_NOT_ENABLED'), this.exportConfig.context);
      } else {
        log.debug('Error occurred during personalize export', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      }
      this.exportConfig.personalizationEnabled = false;
    }
  }
}
