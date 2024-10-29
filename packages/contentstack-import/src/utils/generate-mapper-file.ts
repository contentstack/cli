import ImportSetupCommand from '@contentstack/cli-cm-import-setup';
import { ImportConfig } from '../types';

export const checkAndCreateMapperFile = async (config: ImportConfig) => {
  try {
    const args = ['--data-dir', config.data, '--modules', config.moduleName, '--backup-dir', config.backupDir];
    if (config.alias) args.push('--alias', config.alias);
    else args.push('--stack-api-key', config.apiKey);
    await ImportSetupCommand.run(args);
  } catch (error) {
    throw new Error(`Error while creating the mapper file: ${error?.message}`);
  }
};
