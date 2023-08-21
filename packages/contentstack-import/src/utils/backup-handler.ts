import * as os from 'os';
import * as path from 'path';
import camelCase from 'lodash/camelCase';
import { copy, copySync, removeSync } from 'fs-extra';

import { fileHelper } from './index';
import { ImportConfig } from '../types';

export default function setupBackupDir(importConfig: ImportConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir')) {
      return resolve(importConfig.useBackedupDir);
    }

    //NOTE: If the backup folder's directory is provided, create it at that location; otherwise, the default path (working directory).
    let backupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
    if (importConfig.createBackupDir) {
      if (fileHelper.fileExistsSync(importConfig.createBackupDir)) {
        fileHelper.removeDirSync(importConfig.createBackupDir);
      }
      fileHelper.makeDirectory(importConfig.createBackupDir);
      backupDirPath = importConfig.createBackupDir;
    }

    const currentWorkingDir = process.cwd();
    //handle error :- Cannot copy to a subdirectory of itself
    if (importConfig.contentDir === currentWorkingDir || importConfig.contentDir === `${currentWorkingDir}/`) {
      handleSubDirectoryError(importConfig, backupDirPath);
      return resolve(backupDirPath);
    } else {
      return copy(importConfig.contentDir, backupDirPath, (error: any) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    }
  });
}

/**
 * handle subdirectory error
 * https://github.com/jprichardson/node-fs-extra/issues/708
 * @param {ImportConfig} importConfig
 * @param {string} backupDirPath
 */
const handleSubDirectoryError = (importConfig: ImportConfig, backupDirPath: string) => {
  const tempDestination = `${os.platform() === 'darwin' ? '/private/tmp' : '/tmp'}/${camelCase(backupDirPath)}`;
  copySync(importConfig.contentDir, tempDestination);
  copySync(tempDestination, backupDirPath);
  removeSync(tempDestination);
};
