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
import BaseClass from './base-class';

export default class ExportPersonalize extends BaseClass {
  public exportConfig: ExportConfig;
  public personalizeConfig: { dirName: string; baseURL: Record<string, string> } & AnyProperty;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.exportConfig.context.module = 'personalize';
    this.currentModuleName = 'Personalize';
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting personalize export process...', this.exportConfig.context);

      const [canProceed, moduleCount] = await this.withLoadingSpinner(
        'PERSONALIZE: Analyzing personalization configuration...',
        async () => {
          const canProceed = this.validatePersonalizeSetup();
          const moduleCount = canProceed ? this.getPersonalizeModuleCount() : 0;
          return [canProceed, moduleCount];
        },
      );

      if (!canProceed) {
        log.debug('Personalization setup validation failed, exiting', this.exportConfig.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);

      // Add projects export process (always runs first)
      progress.addProcess('Projects', 1);

      // Add personalize modules processes if enabled
      if (this.exportConfig.personalizationEnabled && moduleCount > 0) {
        progress.addProcess('Personalize Modules', moduleCount);
      }

      try {
        // Process projects export
        progress.startProcess('Projects').updateStatus('Exporting personalization projects...', 'Projects');
        log.debug('Starting projects export for personalization...', this.exportConfig.context);
        await new ExportProjects(this.exportConfig).start();
        this.progressManager?.tick(true, 'projects export', null, 'Projects');
        progress.completeProcess('Projects', true);

        if (this.exportConfig.personalizationEnabled && moduleCount > 0) {
          progress
            .startProcess('Personalize Modules')
            .updateStatus('Processing personalize modules...', 'Personalize Modules');
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
              this.progressManager?.tick(true, `module: ${module}`, null, 'Personalize Modules');
              log.debug(`Completed export for module: ${module}`, this.exportConfig.context);
            } else {
              log.debug(`Module not implemented: ${module}`, this.exportConfig.context);
              this.progressManager?.tick(false, `module: ${module}`, 'Module not implemented', 'Personalize Modules');
              log.info(messageHandler.parse('PERSONALIZE_MODULE_NOT_IMPLEMENTED', module), this.exportConfig.context);
            }
          }

          progress.completeProcess('Personalize Modules', true);
          log.debug('Completed all personalize module exports', this.exportConfig.context);
        } else {
          log.debug('Personalization is disabled, skipping personalize module exports', this.exportConfig.context);
        }

        this.completeProgress(true);
        log.success('Personalize export completed successfully', this.exportConfig.context);
      } catch (moduleError) {
        if (moduleError === 'Forbidden') {
          log.debug('Personalize access forbidden, personalization not enabled', this.exportConfig.context);
          log.info(messageHandler.parse('PERSONALIZE_NOT_ENABLED'), this.exportConfig.context);
          this.exportConfig.personalizationEnabled = false;
          this.completeProgress(true); // Complete successfully but with personalization disabled
        } else {
          log.debug('Error occurred during personalize module processing', this.exportConfig.context);
          this.completeProgress(false, moduleError?.message || 'Personalize module processing failed');
          throw moduleError;
        }
      }
    } catch (error) {
      log.debug('Error occurred during personalize export', this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
      this.exportConfig.personalizationEnabled = false;
      this.completeProgress(false, error?.message || 'Personalize export failed');
    }
  }

  private validatePersonalizeSetup(): boolean {
    if (!this.personalizeConfig.baseURL[this.exportConfig.region.name]) {
      log.debug(`Personalize URL not set for region: ${this.exportConfig.region.name}`, this.exportConfig.context);
      log.info(messageHandler.parse('PERSONALIZE_URL_NOT_SET'), this.exportConfig.context);
      this.exportConfig.personalizationEnabled = false;
      return false;
    }

    if (this.exportConfig.management_token) {
      log.debug('Management token detected, skipping personalize export', this.exportConfig.context);
      log.info(messageHandler.parse('PERSONALIZE_SKIPPING_WITH_MANAGEMENT_TOKEN'), this.exportConfig.context);
      this.exportConfig.personalizationEnabled = false;
      return false;
    }

    return true;
  }

  private getPersonalizeModuleCount(): number {
    const order = this.exportConfig.modules?.personalize?.exportOrder;
    return Array.isArray(order) ? order.length : 0;
  }
}
