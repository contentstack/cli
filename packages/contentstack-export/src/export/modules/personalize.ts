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
          
          log.debug(
            `Personalize validation - canProceed: ${canProceed}, moduleCount: ${moduleCount}`,
            this.exportConfig.context,
          );
          
          return [canProceed, moduleCount];
        },
      );

      if (!canProceed) {
        log.debug('Personalization setup validation failed, exiting', this.exportConfig.context);
        return;
      }

      log.debug(`Creating personalize progress with moduleCount: ${moduleCount}`, this.exportConfig.context);
      const progress = this.createNestedProgress(this.currentModuleName);

      // Add projects export process (always runs first)
      progress.addProcess('Projects', 1);
      log.debug('Added Projects process to personalize progress', this.exportConfig.context);

      // Add individual processes for each enabled personalize module
      if (moduleCount > 0) {
        const moduleMapper = {
          events: 'Events',
          attributes: 'Attributes', 
          audiences: 'Audiences',
          experiences: 'Experiences',
        };

        const order: (keyof typeof moduleMapper)[] = this.exportConfig.modules.personalize
          .exportOrder as (keyof typeof moduleMapper)[];
        
        log.debug(
          `Adding ${order.length} personalize module processes: ${order.join(', ')}`,
          this.exportConfig.context,
        );
        
        // Add a process for each module - use 1 as default since actual counts will be tracked by individual modules
        for (const module of order) {
          const processName = moduleMapper[module];
          progress.addProcess(processName, 1);
          log.debug(`Added ${processName} process to personalize progress`, this.exportConfig.context);
        }
      } else {
        log.debug('No personalize modules to add to progress', this.exportConfig.context);
      }

      try {
        // Process projects export
        progress.startProcess('Projects').updateStatus('Exporting personalization projects...', 'Projects');
        log.debug('Starting projects export for personalization...', this.exportConfig.context);

        const projectsExporter = new ExportProjects(this.exportConfig);
        projectsExporter.setParentProgressManager(progress);
        await projectsExporter.start();

        this.progressManager?.tick(true, 'projects export', null, 'Projects');
        progress.completeProcess('Projects', true);

        // Process personalize modules if we have any configured
        if (moduleCount > 0) {
          log.debug('Processing personalize modules...', this.exportConfig.context);

          const moduleInstanceMapper = {
            events: new ExportEvents(this.exportConfig),
            attributes: new ExportAttributes(this.exportConfig),
            audiences: new ExportAudiences(this.exportConfig),
            experiences: new ExportExperiences(this.exportConfig),
          };

          const moduleDisplayMapper = {
            events: 'Events',
            attributes: 'Attributes', 
            audiences: 'Audiences',
            experiences: 'Experiences',
          };

          // Set parent progress manager for all sub-modules
          Object.values(moduleInstanceMapper).forEach(moduleInstance => {
            moduleInstance.setParentProgressManager(progress);
          });

          const order: (keyof typeof moduleInstanceMapper)[] = this.exportConfig.modules.personalize
            .exportOrder as (keyof typeof moduleInstanceMapper)[];

          log.debug(`Personalize export order: ${order.join(', ')}`, this.exportConfig.context);

          for (const module of order) {
            log.debug(`Processing personalize module: ${module}`, this.exportConfig.context);
            const processName = moduleDisplayMapper[module];

            if (moduleInstanceMapper[module]) {
              // Start the process for this specific module
              progress.startProcess(processName).updateStatus(`Exporting ${module}...`, processName);
              
              log.debug(`Starting export for module: ${module}`, this.exportConfig.context);
              
              // Check if personalization is enabled before processing
              if (this.exportConfig.personalizationEnabled) {
                await moduleInstanceMapper[module].start();
                
                // Complete the process - individual modules handle item-level progress tracking
                progress.completeProcess(processName, true);
                log.debug(`Completed export for module: ${module}`, this.exportConfig.context);
              } else {
                // Personalization not enabled, skip with informative message
                log.debug(`Skipping ${module} - personalization not enabled`, this.exportConfig.context);
                
                // Mark as skipped
                this.progressManager?.tick(true, `${module} skipped (no project)`, null, processName);
                
                progress.completeProcess(processName, true);
                log.info(`Skipped ${module} export - no personalize project found`, this.exportConfig.context);
              }
            } else {
              log.debug(`Module not implemented: ${module}`, this.exportConfig.context);
              progress.startProcess(processName).updateStatus(`Module not implemented: ${module}`, processName);
              this.progressManager?.tick(false, `module: ${module}`, 'Module not implemented', processName);
              progress.completeProcess(processName, false);
              log.info(messageHandler.parse('PERSONALIZE_MODULE_NOT_IMPLEMENTED', module), this.exportConfig.context);
            }
          }

          log.debug('Completed all personalize module processing', this.exportConfig.context);
        } else {
          log.debug('No personalize modules configured for processing', this.exportConfig.context);
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
