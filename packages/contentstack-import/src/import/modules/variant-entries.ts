import path from 'path';
import { Import, ImportHelperMethodsConfig, LogType, ProjectStruct } from '@contentstack/cli-variants';
import { sanitizePath } from '@contentstack/cli-utilities';
import { ImportConfig, ModuleClassParams } from '../../types';
import {
  log,
  lookUpTerms,
  lookupAssets,
  lookupEntries,
  lookupExtension,
  restoreJsonRteEntryRefs,
  fsUtil,
} from '../../utils';

export default class ImportVarientEntries {
  private config: ImportConfig;
  public personalize: ImportConfig['modules']['personalize'];
  private projectMapperFilePath: string;

  constructor({ importConfig }: ModuleClassParams) {
    this.config = importConfig;
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
      const project = fsUtil.readFile(this.projectMapperFilePath) as ProjectStruct;
      if (project && project.uid) {
        this.config.modules.personalize.project_id = project.uid;
        const helpers: ImportHelperMethodsConfig = {
          lookUpTerms,
          lookupAssets,
          lookupEntries,
          lookupExtension,
          restoreJsonRteEntryRefs,
        };
        await new Import.VariantEntries(Object.assign(this.config, { helpers })).import();
      } else {
        log(this.config, 'Skipping entry variants import because no personalize project is linked.', 'info');
      }
    } catch (error) {
      log(this.config, error, 'error');
    }
  }
}
