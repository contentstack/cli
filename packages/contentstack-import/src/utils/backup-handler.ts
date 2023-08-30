import * as path from 'path';
import { copy } from 'fs-extra';
import { cliux } from '@contentstack/cli-utilities';

import { fileHelper } from './index';
import { ImportConfig } from '../types';

export default function setupBackupDir(importConfig: ImportConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir')) {
      return resolve(importConfig.useBackedupDir);
    }

    const subDir = isSubDirectory(importConfig);
    let backupDirPath: string;

    if (subDir) {
      backupDirPath = path.resolve(importConfig.contentDir, '..', '_backup_' + Math.floor(Math.random() * 1000));
      if (importConfig.createBackupDir) {
        cliux.print(
          `Warning!!! Provided backup directory path is a sub directory of the content directory, Cannot copy to a sub directory. Hence new backup directory created - ${backupDirPath}`,
          {
            color: 'yellow',
          },
        );
      }
    } else {
      //NOTE: If the backup folder's directory is provided, create it at that location; otherwise, the default path (working directory).
      backupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
      if (importConfig.createBackupDir) {
        if (fileHelper.fileExistsSync(importConfig.createBackupDir)) {
          fileHelper.removeDirSync(importConfig.createBackupDir);
        }
        fileHelper.makeDirectory(importConfig.createBackupDir);
        backupDirPath = importConfig.createBackupDir;
      }
    }

    if (backupDirPath) {
      cliux.print('Copying content to the backup directory...');
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
 * Check whether provided backup directory path is sub directory or not
 * @param importConfig
 * @returns
 */
function isSubDirectory(importConfig: ImportConfig) {
  const parent = importConfig.contentDir;
  const child = importConfig.createBackupDir ? importConfig.createBackupDir : process.cwd();
  const relative = path.relative(parent, child);
  if (relative) {
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  }
  //true if both parent and child have same path
  return true;
}
