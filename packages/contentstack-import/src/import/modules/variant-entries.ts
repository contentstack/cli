import path from 'path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
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
  IMPORT_PROCESS_NAMES,
  IMPORT_MODULE_CONTEXTS,
  IMPORT_PROCESS_STATUS,
  IMPORT_MODULE_NAMES,
} from '../../utils';
import BaseClass from './base-class';

export default class ImportVariantEntries extends BaseClass {
  private config: ImportConfig;
  public personalize: ImportConfig['modules']['personalize'];
  private projectMapperFilePath: string;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.config = importConfig;
    this.config.context.module = IMPORT_MODULE_CONTEXTS.VARIANT_ENTRIES;
    this.currentModuleName = IMPORT_MODULE_NAMES[IMPORT_MODULE_CONTEXTS.VARIANT_ENTRIES];
    this.personalize = importConfig.modules.personalize;
    this.projectMapperFilePath = path.resolve(
      sanitizePath(this.config.data),
      'mapper',
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

      const progress = this.createSimpleProgress(this.currentModuleName);

      progress.updateStatus(IMPORT_PROCESS_STATUS[IMPORT_PROCESS_NAMES.VARIANT_ENTRIES_IMPORT].IMPORTING);
      log.info('Starting variant entries import process', this.config.context);
      await this.importVariantEntries();

      this.completeProgress(true);
      log.success('Variant entries imported successfully', this.config.context);
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

      log.debug('Starting variant entries import', this.config.context);
      await variantEntriesImporter.import();

      this.progressManager?.tick(
        true,
        'variant entries import completed',
        null,
        IMPORT_PROCESS_NAMES.VARIANT_ENTRIES_IMPORT,
      );
      log.debug('Variant entries import completed successfully', this.config.context);
    } else {
      log.debug('No valid project found in mapper file', this.config.context);
      this.progressManager?.tick(
        false,
        'variant entries import',
        'No personalize project linked',
        IMPORT_PROCESS_NAMES.VARIANT_ENTRIES_IMPORT,
      );
      log.info('Skipping entry variants import because no personalize project is linked.', this.config.context);
    }
  }

  private async analyzeVariantEntries(): Promise<[boolean]> {
    return this.withLoadingSpinner('VARIANT ENTRIES: Analyzing import data...', async () => {
      log.debug(`Reading project mapper from: ${this.projectMapperFilePath}`, this.config.context);

      if (!fileHelper.fileExistsSync(this.projectMapperFilePath)) {
        log.debug('Project mapper file does not exist', this.config.context);
        log.info('Skipping entry variants import because no personalize project mapper found.', this.config.context);
        return [false] as [boolean];
      }

      const project = fsUtil.readFile(this.projectMapperFilePath) as ProjectStruct;
      const hasValidProject = !!(project && project.uid); // Convert to boolean

      if (hasValidProject) {
        log.debug(`Found valid personalize project: ${project.uid}`, this.config.context);
      } else {
        log.debug('No valid project found in mapper file', this.config.context);
      }

      return [hasValidProject] as [boolean];
    });
  }
}
