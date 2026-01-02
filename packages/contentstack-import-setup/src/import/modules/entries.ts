import { ModuleClassParams } from '../../types';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

export default class EntriesImportSetup extends BaseImportSetup {
  constructor(options: ModuleClassParams) {
    super(options);
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.ENTRIES];
  }

  async start() {
    try {
      const progress = this.createSimpleProgress(this.currentModuleName, 1);
      
      progress.updateStatus('Setting up dependencies...');
      await this.setupDependencies();
      
      this.progressManager?.tick(true, 'entries mapper setup', null);
      this.completeProgress(true);
      
      log(this.config, `The required setup files for entries have been generated successfully.`, 'success');
    } catch (error) {
      this.completeProgress(false, error?.message || 'Entries mapper generation failed');
      log(this.config, `Error occurred while generating the entry mapper: ${error.message}.`, 'error');
    }
  }
}
