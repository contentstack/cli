import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
  AnyProperty,
} from '@contentstack/cli-variants';
import { handleAndLogError, messageHandler, log, CLIProgressManager } from '@contentstack/cli-utilities';

import { ModuleClassParams, ExportConfig } from '../../types';
import BaseClass from './base-class';

export default class ExportPersonalize extends BaseClass {
  public exportConfig: ExportConfig;
  public personalizeConfig: { dirName: string; baseURL: Record<string, string> } & AnyProperty;

  private readonly moduleInstanceMapper = {
    events: ExportEvents,
    attributes: ExportAttributes,
    audiences: ExportAudiences,
    experiences: ExportExperiences,
  };

  private readonly moduleDisplayMapper = {
    events: 'Events',
    attributes: 'Attributes',
    audiences: 'Audiences',
    experiences: 'Experiences',
  };

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

      this.addProjectProcess(progress);
      this.addModuleProcesses(progress, moduleCount);

      try {
        await this.exportProjects(progress);

        if (moduleCount > 0) {
          log.debug('Processing personalize modules...', this.exportConfig.context);
          await this.exportModules(progress);
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
          this.completeProgress(true); // considered successful even if skipped
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

  private addProjectProcess(progress: CLIProgressManager) {
    progress.addProcess('Projects', 1);
    log.debug('Added Projects process to personalize progress', this.exportConfig.context);
  }

  private addModuleProcesses(progress: CLIProgressManager, moduleCount: number) {
    if (moduleCount > 0) {
      // false positive - no hardcoded secret here
      // @ts-ignore-next-line secret-detection
      const order: (keyof typeof this.moduleDisplayMapper)[] = this.exportConfig.modules.personalize
        .exportOrder as (keyof typeof this.moduleDisplayMapper)[];

      log.debug(`Adding ${order.length} personalize module processes: ${order.join(', ')}`, this.exportConfig.context);

      for (const module of order) {
        const processName = this.moduleDisplayMapper[module];
        progress.addProcess(processName, 1);
        log.debug(`Added ${processName} process to personalize progress`, this.exportConfig.context);
      }
    } else {
      log.debug('No personalize modules to add to progress', this.exportConfig.context);
    }
  }

  private async exportProjects(progress: CLIProgressManager) {
    progress.startProcess('Projects').updateStatus('Exporting personalization projects...', 'Projects');
    log.debug('Starting projects export for personalization...', this.exportConfig.context);

    const projectsExporter = new ExportProjects(this.exportConfig);
    projectsExporter.setParentProgressManager(progress);
    await projectsExporter.start();

    progress.completeProcess('Projects', true);
  }

  private async exportModules(progress: CLIProgressManager) {
    // Set parent progress for all module instances
    Object.entries(this.moduleInstanceMapper).forEach(([_, ModuleClass]) => {
      const instance = new ModuleClass(this.exportConfig);
      instance.setParentProgressManager(progress);
    });

    // false positive - no hardcoded secret here
    // @ts-ignore-next-line secret-detection
    const order: (keyof typeof this.moduleInstanceMapper)[] = this.exportConfig.modules.personalize
      .exportOrder as (keyof typeof this.moduleInstanceMapper)[];

    log.debug(`Personalize export order: ${order.join(', ')}`, this.exportConfig.context);

    for (const module of order) {
      log.debug(`Processing personalize module: ${module}`, this.exportConfig.context);
      const processName = this.moduleDisplayMapper[module];
      const ModuleClass = this.moduleInstanceMapper[module];

      if (ModuleClass) {
        progress.startProcess(processName).updateStatus(`Exporting ${module}...`, processName);
        log.debug(`Starting export for module: ${module}`, this.exportConfig.context);

        if (this.exportConfig.personalizationEnabled) {
          const exporter = new ModuleClass(this.exportConfig);
          exporter.setParentProgressManager(progress);
          await exporter.start();

          progress.completeProcess(processName, true);
          log.debug(`Completed export for module: ${module}`, this.exportConfig.context);
        } else {
          log.debug(`Skipping ${module} - personalization not enabled`, this.exportConfig.context);
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
  }
}
