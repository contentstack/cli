import { Import } from '@contentstack/cli-variants';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import BaseClass from './base-class';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalize extends BaseClass {
  private config: ImportConfig;
  public personalizeConfig: ImportConfig['modules']['personalize'];

  private readonly moduleDisplayMapper = {
    events: 'Events',
    attributes: 'Attributes',
    audiences: 'Audiences',
    experiences: 'Experiences',
  };

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.config = importConfig;
    this.config.context.module = 'personalize';
    this.currentModuleName = 'Personalize';
    this.personalizeConfig = importConfig.modules.personalize;
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting personalize import process...', this.config.context);
      const [canImport, modulesCount] = await this.analyzePersonalize();
      if (!canImport) {
        log.info('Personalize import skipped', this.config.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);

      this.addProjectProcess(progress);
      this.addModuleProcesses(progress, modulesCount);

      // Step 1: Import personalize project
      await this.importProjects(progress);

      // Step 2: Import personalize data modules (if enabled)
      if (this.personalizeConfig.importData && modulesCount > 0) {
        log.debug('Processing personalize modules...', this.config.context);
        await this.importModules(progress);
      } else {
        log.debug('No personalize modules configured for processing', this.config.context);
      }

      this.completeProgress(true);
      log.success('Personalize import completed successfully', this.config.context);
    } catch (error) {
      this.personalizeConfig.importData = false; // Stop personalize import if project creation fails
      this.completeProgress(false, (error as any)?.message || 'Personalize import failed');
      handleAndLogError(error, { ...this.config.context });
      if (!this.personalizeConfig.importData) {
        log.debug('Personalize import data flag set to false due to error', this.config.context);
        log.info('Skipping personalize migration...', this.config.context);
      }
    }
  }

  private addProjectProcess(progress: any) {
    progress.addProcess('Projects', 1);
    log.debug('Added Projects process to personalize progress', this.config.context);
  }

  private addModuleProcesses(progress: any, moduleCount: number) {
    if (moduleCount > 0) {
      const order: (keyof typeof this.moduleDisplayMapper)[] = this.personalizeConfig
        .importOrder as (keyof typeof this.moduleDisplayMapper)[];

      log.debug(`Adding ${order.length} personalize module processes: ${order.join(', ')}`, this.config.context);

      for (const module of order) {
        const processName = this.moduleDisplayMapper[module];
        progress.addProcess(processName, 1);
        log.debug(`Added ${processName} process to personalize progress`, this.config.context);
      }
    } else {
      log.debug('No personalize modules to add to progress', this.config.context);
    }
  }

  private async importProjects(progress: any): Promise<void> {
    progress.startProcess('Projects').updateStatus('Importing personalization projects...', 'Projects');
    log.debug('Starting projects import for personalization...', this.config.context);

    const projectInstance = new Import.Project(this.config);
    projectInstance.setParentProgressManager(progress);
    await projectInstance.import();

    progress.completeProcess('Projects', true);
  }

  private async importModules(progress: any): Promise<void> {
    const moduleMapper = {
      events: Import.Events,
      audiences: Import.Audiences,
      attributes: Import.Attribute,
      experiences: Import.Experiences,
    };

    const order: (keyof typeof moduleMapper)[] = this.personalizeConfig.importOrder as (keyof typeof moduleMapper)[];

    log.debug(`Personalize import order: ${order.join(', ')}`, this.config.context);

    for (const module of order) {
      log.debug(`Processing personalize module: ${module}`, this.config.context);
      const processName = this.moduleDisplayMapper[module];
      const ModuleClass = moduleMapper[module];

      if (ModuleClass) {
        progress.startProcess(processName).updateStatus(`Importing ${module}...`, processName);
        log.debug(`Starting import for module: ${module}`, this.config.context);

        if (this.personalizeConfig.importData) {
          const importer = new ModuleClass(this.config);
          importer.setParentProgressManager(progress);
          await importer.import();

          progress.completeProcess(processName, true);
          log.debug(`Completed import for module: ${module}`, this.config.context);
        } else {
          log.debug(`Skipping ${module} - personalization not enabled`, this.config.context);
          this.progressManager?.tick(true, `${module} skipped (no project)`, null, processName);
          progress.completeProcess(processName, true);
          log.info(`Skipped ${module} import - no personalize project found`, this.config.context);
        }
      } else {
        log.debug(`Module not implemented: ${module}`, this.config.context);
        progress.startProcess(processName).updateStatus(`Module not implemented: ${module}`, processName);
        this.progressManager?.tick(false, `module: ${module}`, 'Module not implemented', processName);
        progress.completeProcess(processName, false);
        log.info(`Module not implemented: ${module}`, this.config.context);
      }
    }

    log.debug('All personalize modules processed', this.config.context);
  }

  private async analyzePersonalize(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('PERSONALIZE: Analyzing import configuration...', async () => {
      if (!this.personalizeConfig.baseURL[this.config.region.name]) {
        log.debug(`No baseURL found for region: ${this.config.region.name}`, this.config.context);
        log.info('Skipping Personalize project import, personalize url is not set', this.config.context);
        this.personalizeConfig.importData = false;
        return [false, 0];
      }

      if (this.config.management_token) {
        log.debug('Management token detected, skipping personalize import', this.config.context);
        log.info('Skipping Personalize project import when using management token', this.config.context);
        return [false, 0];
      }

      const modulesCount = this.personalizeConfig.importData ? this.personalizeConfig.importOrder?.length || 0 : 0;

      log.debug(`Personalize analysis complete: canImport=true, modulesCount=${modulesCount}`, this.config.context);
      return [true, modulesCount];
    });
  }
}
