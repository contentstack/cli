import { join } from 'node:path';
import { fileHelper, fsUtil } from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams } from '../../types';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

export default class ImportStack extends BaseClass {
  // classname
  private stackSettingsPath: string;
  private envUidMapperPath: string;
  private stackSettings: Record<string, any> | null = null;
  private envUidMapper: Record<string, string> = {};

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.stackSettingsPath = join(this.importConfig.backupDir, 'stack', 'settings.json');
    this.envUidMapperPath = join(this.importConfig.backupDir, 'mapper', 'environments', 'uid-mapping.json');
  }

  async start(): Promise<void> {
    if (this.importConfig.management_token) {
      log.info(
        'Skipping stack settings import: Operation is not supported when using a management token.',
        this.importConfig.context,
      );
      return;
    }

    if (fileHelper.fileExistsSync(this.stackSettingsPath)) {
      this.stackSettings = fsUtil.readFile(this.stackSettingsPath, true) as Record<string, any>;
    } else {
      log.info('No stack setting found!', this.importConfig.context);
      return;
    }

    if (fileHelper.fileExistsSync(this.envUidMapperPath)) {
      this.envUidMapper = fsUtil.readFile(this.envUidMapperPath, true) as Record<string, string>;
    } else {
      log.warn(
        'Skipping stack settings import. Please run the environments migration first.',
        this.importConfig.context,
      );
      return;
    }

    if (this.stackSettings?.live_preview && this.stackSettings?.live_preview['default-env']) {
      const oldEnvUid = this.stackSettings.live_preview['default-env'];
      const mappedEnvUid = this.envUidMapper[oldEnvUid];
      this.stackSettings.live_preview['default-env'] = mappedEnvUid;
    }

    try {
      await this.stack.addSettings(this.stackSettings);
      log.success('Successfully imported stack', this.importConfig.context);
    } catch (error) {
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }
}
