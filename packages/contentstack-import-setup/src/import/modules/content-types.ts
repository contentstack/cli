import * as chalk from 'chalk';
import { fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import ExtensionImportSetup from './extensions';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

export default class ContentTypesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.CONTENT_TYPES];
  }

  async start() {
    try {
      const progress = this.createNestedProgress(this.currentModuleName);
      
      // Add processes
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_DEPENDENCY_SETUP, this.dependencies?.length || 0);
      progress.addProcess(PROCESS_NAMES.CONTENT_TYPES_MAPPER_GENERATION, 1);

      // Setup dependencies
      if (this.dependencies && this.dependencies.length > 0) {
        progress
          .startProcess(PROCESS_NAMES.CONTENT_TYPES_DEPENDENCY_SETUP)
          .updateStatus(
            PROCESS_STATUS.CONTENT_TYPES_DEPENDENCY_SETUP.SETTING_UP,
            PROCESS_NAMES.CONTENT_TYPES_DEPENDENCY_SETUP,
          );
        
        await this.setupDependencies();
        
        this.progressManager?.tick(true, 'dependencies setup', null, PROCESS_NAMES.CONTENT_TYPES_DEPENDENCY_SETUP);
        progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_DEPENDENCY_SETUP, true);
      }

      // Mapper generation
      progress
        .startProcess(PROCESS_NAMES.CONTENT_TYPES_MAPPER_GENERATION)
        .updateStatus(
          PROCESS_STATUS.CONTENT_TYPES_MAPPER_GENERATION.GENERATING,
          PROCESS_NAMES.CONTENT_TYPES_MAPPER_GENERATION,
        );
      
      this.progressManager?.tick(true, 'mapper generation', null, PROCESS_NAMES.CONTENT_TYPES_MAPPER_GENERATION);
      progress.completeProcess(PROCESS_NAMES.CONTENT_TYPES_MAPPER_GENERATION, true);

      this.completeProgress(true);
      log(this.config, `The required setup files for content types have been generated successfully.`, 'success');
    } catch (error) {
      this.completeProgress(false, error?.message || 'Content types mapper generation failed');
      log(this.config, `Error occurred while generating the content type mapper: ${error.message}.`, 'error');
    }
  }
}