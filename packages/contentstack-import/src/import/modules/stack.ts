import path from 'path';
import { log } from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams } from '../../types';
import { readFile } from '../../utils/file-helper';

export default class ImportStack extends BaseClass {
  private stackFolderPath: string;
  private stackSettingsPath: string;
  private uidMappingPath: string;

  constructor(moduleParams: ModuleClassParams) {
    super(moduleParams);
    // Set stack folder path based on branch configuration
    if (this.importConfig.branchEnabled && this.importConfig.branchDir) {
      this.stackFolderPath = path.join(this.importConfig.branchDir, 'stack');
    } else {
      this.stackFolderPath = path.join(this.importConfig.backupDir, 'stack');
    }
    this.stackSettingsPath = path.join(this.stackFolderPath, 'settings.json');
    this.uidMappingPath = path.join(this.importConfig.backupDir, 'uid-mapping.json');
  }

  async start(): Promise<any> {
    try {
      // Load stack settings
      const stackSettings = await this.loadStackSettings();
      if (!stackSettings) {
        return;
      }

      // Load environment UID mapping
      const uidMapping = await this.loadUidMapping();
      if (!uidMapping) {
        return;
      }

      // Import stack settings with mapped environment UIDs
      await this.importStackSettings(stackSettings, uidMapping);
    } catch (error) {
      log(this.importConfig, `Failed to import stack settings: ${error}`, 'error');
    }
  }

  private async loadStackSettings(): Promise<any> {
    try {
      // First try to load from branch directory if branch is specified
      if (this.importConfig.branchEnabled && this.importConfig.branchDir) {
        const branchStackPath = path.join(this.importConfig.branchDir, 'stack', 'settings.json');
        try {
          const settings = await readFile(branchStackPath);
          if (settings) {
            log(this.importConfig, `Loaded stack settings from branch directory: ${branchStackPath}`, 'info');
            return settings;
          }
        } catch (error) {
          log(this.importConfig, `Stack settings not found in branch directory: ${branchStackPath}`, 'warn');
        }
      }

      // Fallback to root directory
      try {
        const settings = await readFile(this.stackSettingsPath);
        if (settings) {
          log(this.importConfig, `Loaded stack settings from root directory: ${this.stackSettingsPath}`, 'info');
          return settings;
        }
      } catch (error) {
        log(this.importConfig, `Stack settings not found in root directory: ${this.stackSettingsPath}`, 'warn');
      }

      log(this.importConfig, 'No stack settings found in either branch or root directory', 'warn');
      return null;
    } catch (error) {
      log(this.importConfig, `Error loading stack settings: ${error}`, 'error');
      return null;
    }
  }

  private async loadUidMapping(): Promise<any> {
    try {
      const uidMapping = await readFile(this.uidMappingPath);
      if (!uidMapping) {
        log(this.importConfig, `Environment UID mapping not found at: ${this.uidMappingPath}`, 'warn');
        return null;
      }
      log(this.importConfig, 'Loaded environment UID mapping successfully', 'info');
      return uidMapping;
    } catch (error) {
      log(this.importConfig, `Error loading environment UID mapping: ${error}`, 'error');
      return null;
    }
  }

  private async importStackSettings(stackSettings: any, uidMapping: any): Promise<void> {
    try {
      // Map environment UIDs
      if (stackSettings.environments) {
        stackSettings.environments = stackSettings.environments.map((env: any) => {
          const mappedUid = uidMapping[env.uid];
          if (mappedUid) {
            return { ...env, uid: mappedUid };
          }
          return env;
        });
      }

      // Handle live preview environment
      if (stackSettings.live_preview && stackSettings.live_preview.environment) {
        const mappedUid = uidMapping[stackSettings.live_preview.environment];
        if (mappedUid) {
          stackSettings.live_preview.environment = mappedUid;
        } else {
          log(this.importConfig, 'Live preview environment UID not found in mapping', 'warn');
        }
      }

      // Update stack settings
      await this.stack.update({ stack_settings: stackSettings });
      log(this.importConfig, 'Successfully imported stack settings', 'info');
    } catch (error) {
      log(this.importConfig, `Failed to import stack settings: ${error}`, 'error');
      throw error;
    }
  }
} 