import path from 'path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PATH_CONSTANTS } from '../../constants';
import { Import, ImportHelperMethodsConfig, ProjectStruct } from '@contentstack/cli-variants';
import { ImportConfig, ModuleClassParams } from '../../types';
import {
  lookUpTerms,
  lookupAssets,
  lookupEntries,
  lookupExtension,
  restoreJsonRteEntryRefs,
  fsUtil,
  fileHelper,
  PROCESS_NAMES,
  MODULE_CONTEXTS,
  PROCESS_STATUS,
  MODULE_NAMES,
} from '../../utils';
import BaseClass from './base-class';

export default class ImportVariantEntries extends BaseClass {
  private config: ImportConfig;
  public personalize: ImportConfig['modules']['personalize'];
  private projectMapperFilePath: string;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.config = importConfig;
    this.config.context.module = MODULE_CONTEXTS.VARIANT_ENTRIES;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.VARIANT_ENTRIES];
    this.personalize = importConfig.modules.personalize;
    this.projectMapperFilePath = path.resolve(
      sanitizePath(this.config.backupDir),
      PATH_CONSTANTS.MAPPER,
      sanitizePath(this.personalize.dirName),
      'projects',
      'projects.json',
    );
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    try {
      log.debug('Starting variant entries import process...', this.config.context);

      const [hasProject] = await this.analyzeVariantEntries();

      if (!hasProject) {
        log.info('No variant entries found to import', this.config.context);
        return;
      }

      const progress = this.createNestedProgress(this.currentModuleName);

      // Add the variant entries process that will be managed by the actual VariantEntries class
      progress.addProcess(PROCESS_NAMES.VARIANT_ENTRIES_IMPORT, 0); // Start with 0, will be updated dynamically
      progress.startProcess(PROCESS_NAMES.VARIANT_ENTRIES_IMPORT);
      progress.updateStatus(PROCESS_STATUS[PROCESS_NAMES.VARIANT_ENTRIES_IMPORT].IMPORTING, PROCESS_NAMES.VARIANT_ENTRIES_IMPORT);

      log.info('Starting variant entries import process', this.config.context);
      await this.importVariantEntries();

      this.completeProgressWithMessage();

    } catch (error) {
      this.completeProgress(false, (error as any)?.message || 'Variant entries import failed');
      handleAndLogError(error, { ...this.config.context });
    }
  }

  private async importVariantEntries(): Promise<void> {
    const project = fsUtil.readFile(this.projectMapperFilePath) as ProjectStruct;
    log.debug(`Project data loaded: ${JSON.stringify(project)}`, this.config.context);

    if (project && project.uid) {
      log.debug(`Found personalize project: ${project.uid}`, this.config.context);
      this.config.modules.personalize.project_id = project.uid;

      log.debug('Initializing helper methods for variant entries import', this.config.context);
      const helpers: ImportHelperMethodsConfig = {
        lookUpTerms,
        lookupAssets,
        lookupEntries,
        lookupExtension,
        restoreJsonRteEntryRefs,
      };

      log.debug('Helper methods initialized successfully', this.config.context);
      const helperTypes = Object.keys(helpers || {}).join(', ');
      log.debug(`Helper method types available: ${helperTypes}`, this.config.context);

      log.debug('Creating VariantEntries instance', this.config.context);
      const variantEntriesImporter = new Import.VariantEntries(Object.assign(this.config, { helpers }));

      variantEntriesImporter.setParentProgressManager(this.progressManager);

      log.debug('Starting variant entries import', this.config.context);
      await variantEntriesImporter.import();

      // this.progressManager?.tick(true, 'variant entries import completed', null, PROCESS_NAMES.VARIANT_ENTRIES_IMPORT);
      log.debug('Variant entries import completed successfully', this.config.context);
    } else {
      log.debug('No valid project found in mapper file', this.config.context);
      this.progressManager?.tick(
        false,
        'variant entries import',
        'No personalize project linked',
        PROCESS_NAMES.VARIANT_ENTRIES_IMPORT,
      );
      log.info('Skipping entry variants import because no personalize project is linked.', this.config.context);
    }
  }

  private async analyzeVariantEntries(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('VARIANT ENTRIES: Analyzing import data...', async () => {
      log.debug(`Reading project mapper from: ${this.projectMapperFilePath}`, this.config.context);

      if (!fileHelper.fileExistsSync(this.projectMapperFilePath)) {
        log.debug('Project mapper file does not exist', this.config.context);
        log.info('Skipping entry variants import because no personalize project mapper found.', this.config.context);
        return [false, 0] as [boolean, number];
      }

      const project = fsUtil.readFile(this.projectMapperFilePath) as ProjectStruct;
      const hasValidProject = !!(project && project.uid);

      if (!hasValidProject) {
        log.debug('No valid project found in mapper file', this.config.context);
        return [false, 0] as [boolean, number];
      }

      // Basic validation - check if data file exists
      const varientEntriesMapperFilePath = path.resolve(
        sanitizePath(this.config.backupDir),
        'mapper',
        'entries',
        'data-for-variant-entry.json',
      );

      const hasVariantData = fileHelper.fileExistsSync(varientEntriesMapperFilePath);

      log.debug(
        `Found valid personalize project: ${project.uid} with variant data: ${hasVariantData}`,
        this.config.context,
      );

      // Return 0 count - let the variant module update it dynamically
      return [hasValidProject && hasVariantData, 0] as [boolean, number];
    });
  }
}
