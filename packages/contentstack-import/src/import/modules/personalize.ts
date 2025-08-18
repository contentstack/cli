import { Import } from '@contentstack/cli-variants';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import BaseClass from './base-class';
import { ImportConfig, ModuleClassParams } from '../../types';

export default class ImportPersonalize extends BaseClass {
  private config: ImportConfig;
  public personalizeConfig: ImportConfig['modules']['personalize'];

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
      progress.addProcess('Project Import', 1);

      if (this.personalizeConfig.importData && modulesCount > 0) {
        progress.addProcess('Personalize data import', modulesCount);
      }

      // Step 1: Import personalize project
      progress.startProcess('Project Import').updateStatus('Importing personalize project...', 'Project Import');
      log.info('Starting personalize project import', this.config.context);
      await this.importPersonalizeProject(progress);
      progress.completeProcess('Project Import', true);

      // Step 2: Import personalize data modules (if enabled)
      if (this.personalizeConfig.importData && modulesCount > 0) {
        progress
          .startProcess('Personalize data import')
          .updateStatus('Importing personalize data modules...', 'Personalize data import');
        log.info('Starting personalize data import', this.config.context);
        await this.importPersonalizeData(progress);
        progress.completeProcess('Personalize data import', true);
      }

      this.completeProgress(true);
      log.success('Personalize import completed successfully', this.config.context)
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

  private async importPersonalizeProject(parentProgress: any): Promise<void> {
    log.debug('Starting personalize project import', this.config.context);
    log.debug(`Base URL: ${this.personalizeConfig.baseURL[this.config.region.name]}`, this.config.context);

    // Create project instance and set parent progress manager
    const projectInstance = new Import.Project(this.config);
    if (projectInstance.setParentProgressManager) {
      projectInstance.setParentProgressManager(parentProgress);
    }

    await projectInstance.import();

    parentProgress?.tick(true, 'personalize project', null, 'Project Import');
    log.debug('Personalize project import completed', this.config.context);
  }

  private async importPersonalizeData(parentProgress: any): Promise<void> {
    log.debug('Personalize data import is enabled', this.config.context);

    const moduleMapper = {
      events: Import.Events,
      audiences: Import.Audiences,
      attributes: Import.Attribute,
      experiences: Import.Experiences,
    };

    const order: (keyof typeof moduleMapper)[] = this.personalizeConfig.importOrder as (keyof typeof moduleMapper)[];

    log.debug(`Processing ${order.length} personalize modules in order: ${order.join(', ')}`, this.config.context);

    for (const module of order) {
      log.debug(`Starting import for personalize module: ${module}`, this.config.context);
      const Module = moduleMapper[module];

      if (!Module) {
        parentProgress?.tick(
          false,
          `module: ${module}`,
          'Module not found in moduleMapper',
          'Personalize data import',
        );
        log.debug(`Module ${module} not found in moduleMapper`, this.config.context);
        continue;
      }

      try {
        log.debug(`Creating instance of ${module} module`, this.config.context);
        const moduleInstance = new Module(this.config);

        // Set parent progress manager for sub-module
        if (moduleInstance.setParentProgressManager) {
          moduleInstance.setParentProgressManager(parentProgress);
        }

        log.debug(`Importing ${module} module`, this.config.context);
        await moduleInstance.import();

        parentProgress?.tick(true, `module: ${module}`, null, 'Personalize data import');
        log.success(`Successfully imported personalize module: ${module}`, this.config.context);
      } catch (error) {
        parentProgress?.tick(
          false,
          `module: ${module}`,
          (error as any)?.message || 'Import failed',
          'Personalize data import',
        );
        log.debug(`Failed to import personalize module: ${module} - ${(error as any)?.message}`, this.config.context);
        handleAndLogError(error, { ...this.config.context, module });
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
