import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

export default class GlobalFieldsImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.GLOBAL_FIELDS];
  }

  async start() {
    try {
      const progress = this.createNestedProgress(this.currentModuleName);
      
      // Add processes
      progress.addProcess(PROCESS_NAMES.GLOBAL_FIELDS_DEPENDENCY_SETUP, this.dependencies?.length || 0);
      progress.addProcess(PROCESS_NAMES.GLOBAL_FIELDS_MAPPER_GENERATION, 1);

      // Setup dependencies
      if (this.dependencies && this.dependencies.length > 0) {
        progress
          .startProcess(PROCESS_NAMES.GLOBAL_FIELDS_DEPENDENCY_SETUP)
          .updateStatus(
            PROCESS_STATUS.GLOBAL_FIELDS_DEPENDENCY_SETUP.SETTING_UP,
            PROCESS_NAMES.GLOBAL_FIELDS_DEPENDENCY_SETUP,
          );
        
        await this.setupDependencies();
        
        this.progressManager?.tick(true, 'dependencies setup', null, PROCESS_NAMES.GLOBAL_FIELDS_DEPENDENCY_SETUP);
        progress.completeProcess(PROCESS_NAMES.GLOBAL_FIELDS_DEPENDENCY_SETUP, true);
      }

      // Mapper generation
      progress
        .startProcess(PROCESS_NAMES.GLOBAL_FIELDS_MAPPER_GENERATION)
        .updateStatus(
          PROCESS_STATUS.GLOBAL_FIELDS_MAPPER_GENERATION.GENERATING,
          PROCESS_NAMES.GLOBAL_FIELDS_MAPPER_GENERATION,
        );
      
      this.progressManager?.tick(true, 'mapper generation', null, PROCESS_NAMES.GLOBAL_FIELDS_MAPPER_GENERATION);
      progress.completeProcess(PROCESS_NAMES.GLOBAL_FIELDS_MAPPER_GENERATION, true);

      this.completeProgress(true);
      log(this.config, `The required setup files for global fields have been generated successfully.`, 'success');
    } catch (error) {
      this.completeProgress(false, error?.message || 'Global fields mapper generation failed');
      log(this.config, `Error occurred while generating the global field mapper: ${error.message}.`, 'error');
    }
  }
}
