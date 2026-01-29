import {
  ExportProjects,
  ExportExperiences,
  ExportEvents,
  ExportAttributes,
  ExportAudiences,
  AnyProperty,
} from '@contentstack/cli-variants';
import { handleAndLogError, messageHandler, log, CLIProgressManager } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { ModuleClassParams, ExportConfig } from '../../types';
import { MODULE_CONTEXTS, MODULE_NAMES, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

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
    events: PROCESS_NAMES.PERSONALIZE_EVENTS,
    attributes: PROCESS_NAMES.PERSONALIZE_ATTRIBUTES,
    audiences: PROCESS_NAMES.PERSONALIZE_AUDIENCES,
    experiences: PROCESS_NAMES.PERSONALIZE_EXPERIENCES,
  } as const;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.exportConfig.context.module = MODULE_CONTEXTS.PERSONALIZE;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.PERSONALIZE];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting personalize export process...', this.exportConfig.context);

      const [canProceed, projectCount, moduleCount] = await this.withLoadingSpinner(
        'PERSONALIZE: Analyzing personalization configuration and connectivity...',
        async () => {
          // Step 1: Basic validation (URL, tokens)
          const basicValidation = this.validatePersonalizeSetup();
          if (!basicValidation) {
            return [false, 0, 0];
          }

          // Step 2: Check actual project connectivity
          const projectCount = await this.validateProjectConnectivity();
          if (projectCount === 0) {
            log.info('No Personalize Project connected with the given stack', this.exportConfig.context);
            this.exportConfig.personalizationEnabled = false;
            return [false, 0, 0];
          }

          // Step 3: Get module count only if projects exist
          const moduleCount = this.getPersonalizeModuleCount();

          log.debug(
            `Personalize validation - canProceed: true, projectCount: ${projectCount}, moduleCount: ${moduleCount}`,
            this.exportConfig.context,
          );

          // Enable personalization since we have connected projects
          this.exportConfig.personalizationEnabled = true;
          return [true, projectCount, moduleCount];
        },
      );

      if (!canProceed) {
        return;
      }

      log.debug(
        `Creating personalize progress with projectCount: ${projectCount}, moduleCount: ${moduleCount}`,
        this.exportConfig.context,
      );
      const progress = this.createNestedProgress(this.currentModuleName);

      this.addProjectProcess(progress, projectCount);
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

  private async validateProjectConnectivity(): Promise<number> {
    try {
      // Create a temporary ExportProjects instance to check connectivity
      const tempProjectsExporter = new ExportProjects(this.exportConfig);

      // Initialize and fetch projects
      await tempProjectsExporter.init();
      // talisman-ignore-line
      const projectsData = await tempProjectsExporter.projects({ connectedStackApiKey: this.exportConfig.apiKey });

      const projectCount = projectsData?.length || 0;
      log.debug(`Found ${projectCount} connected projects`, this.exportConfig.context);

      return projectCount;
    } catch (error) {
      log.debug(`Error checking project connectivity: ${error}`, this.exportConfig.context);
      return 0;
    }
  }

  private getPersonalizeModuleCount(): number {
    const order = this.exportConfig.modules?.personalize?.exportOrder;
    return Array.isArray(order) ? order.length : 0;
  }

  private addProjectProcess(progress: CLIProgressManager, projectCount: number) {
    progress.addProcess(PROCESS_NAMES.PERSONALIZE_PROJECTS, projectCount);
    log.debug(
      `Added ${PROCESS_NAMES.PERSONALIZE_PROJECTS} process with count: ${projectCount}`,
      this.exportConfig.context,
    );
  }

  private addModuleProcesses(progress: CLIProgressManager, moduleCount: number) {
    if (moduleCount > 0) {
      // talisman-ignore-start
      const order: (keyof typeof this.moduleDisplayMapper)[] = this.exportConfig.modules.personalize
        .exportOrder as (keyof typeof this.moduleDisplayMapper)[];
      // talisman-ignore-end

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
    progress
      .startProcess(PROCESS_NAMES.PERSONALIZE_PROJECTS)
      .updateStatus(PROCESS_STATUS[PROCESS_NAMES.PERSONALIZE_PROJECTS].EXPORTING, PROCESS_NAMES.PERSONALIZE_PROJECTS);
    log.debug('Starting projects export for personalization...', this.exportConfig.context);

    const projectsExporter = new ExportProjects(this.exportConfig);
    projectsExporter.setParentProgressManager(progress);
    await projectsExporter.start();

    progress.completeProcess(PROCESS_NAMES.PERSONALIZE_PROJECTS, true);
  }

  private async exportModules(progress: CLIProgressManager) {
    // Set parent progress for all module instances
    Object.entries(this.moduleInstanceMapper).forEach(([_, ModuleClass]) => {
      const instance = new ModuleClass(this.exportConfig);
      instance.setParentProgressManager(progress);
    });

    // talisman-ignore-start
    const order: (keyof typeof this.moduleInstanceMapper)[] = this.exportConfig.modules.personalize
      .exportOrder as (keyof typeof this.moduleInstanceMapper)[];
    // talisman-ignore-end

    log.debug(`Personalize export order: ${order.join(', ')}`, this.exportConfig.context);

    for (const module of order) {
      log.debug(`Processing personalize module: ${module}`, this.exportConfig.context);
      const processName = this.moduleDisplayMapper[module];
      const ModuleClass = this.moduleInstanceMapper[module];

      if (ModuleClass) {
        progress
          .startProcess(processName)
          .updateStatus((PROCESS_STATUS as any)[processName]?.EXPORTING || `Exporting ${module}...`, processName);
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
