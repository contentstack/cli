import { join } from 'node:path';
import { log, formatError, fileHelper, fsUtil } from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams } from '../../types';

export default class ImportStackSettings extends BaseClass {
  private stackSettingsPath: string;
  private branchStackSettingsPath: string | null;
  private envUidMapperPath: string;
  private stackSettings: Record<string, any> | null = null;
  private envUidMapper: Record<string, string> = {};

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.stackSettingsPath = join(this.importConfig.backupDir, 'stack', 'settings.json');
    this.branchStackSettingsPath = this.importConfig.branchName
      ? join(this.importConfig.backupDir, 'branches', this.importConfig.branchName, 'stack', 'settings.json')
      : null;
    this.envUidMapperPath = join(this.importConfig.backupDir, 'mapper', 'environments', 'uid-mapping.json');
  }

  async start(): Promise<void> {
    log(this.importConfig, 'Migrating stack settings...', 'info');
    
    if (fileHelper.fileExistsSync(this.envUidMapperPath)) {
      this.envUidMapper = fsUtil.readFile(this.envUidMapperPath, true) as Record<string, string>;
    } else {
      throw new Error('Please run the environments migration first.');
    }

    if (this.branchStackSettingsPath && fileHelper.fileExistsSync(this.branchStackSettingsPath)) {
      this.stackSettings = fsUtil.readFile(this.branchStackSettingsPath, true) as Record<string, any>;
    } else if (fileHelper.fileExistsSync(this.stackSettingsPath)) {
      this.stackSettings = fsUtil.readFile(this.stackSettingsPath, true) as Record<string, any>;
    } else {
      log(this.importConfig, 'No stack settings Found!', 'info');
      return;
    }

    if (this.stackSettings.live_preview && this.stackSettings.live_preview['default-env']) {
      const oldEnvUid = this.stackSettings.live_preview['default-env'];
      const mappedEnvUid = this.envUidMapper[oldEnvUid];
      this.stackSettings.live_preview['default-env'] = mappedEnvUid;
    }

    try {
      await this.stack.addSettings(this.stackSettings);
      log(this.importConfig, 'Successfully imported stack settings', 'success');
    } catch (error) {
      log(this.importConfig, `Stack setttings failed to be import! ${formatError(error)}`, 'error');
    }
  }
} 