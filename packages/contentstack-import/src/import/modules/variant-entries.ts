import path from 'path';
import { Import, ImportHelperMethodsConfig, ProjectStruct } from '@contentstack/cli-variants';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { ImportConfig, ModuleClassParams } from '../../types';
import {
  lookUpTerms,
  lookupAssets,
  lookupEntries,
  lookupExtension,
  restoreJsonRteEntryRefs,
  fsUtil,
  fileHelper,
} from '../../utils';

export default class ImportVarientEntries {
  private config: ImportConfig;
  public personalize: ImportConfig['modules']['personalize'];
  private projectMapperFilePath: string;

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
    this.config.context.module = 'variant-entries';
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
   * The `start` function in TypeScript is an asynchronous method that conditionally imports data using
   * helper methods and logs any errors encountered.
   */
  async start(): Promise<void> {
    try {
      log.debug(`Reading project mapper from: ${this.projectMapperFilePath}`, this.config.context);

      if (!fileHelper.fileExistsSync(this.projectMapperFilePath)) {
        log.debug('Project mapper file does not exist', this.config.context);
        log.info('Skipping entry variants import because no personalize project mapper found.', this.config.context);
        return;
      }

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

        log.success('Variant entries imported successfully', this.config.context);
      } else {
        log.debug('No valid project found in mapper file', this.config.context);
        log.info('Skipping entry variants import because no personalize project is linked.', this.config.context);
      }
    } catch (error) {
      handleAndLogError(error, { ...this.config.context });
    }
  }
}
