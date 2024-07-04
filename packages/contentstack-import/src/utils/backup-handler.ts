import * as path from 'path';
import { copy } from 'fs-extra';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';

import { fileHelper, trace } from './index';
import { ImportConfig } from '../types';

export default async function backupHandler(importConfig: ImportConfig): Promise<string> {
  if (importConfig.hasOwnProperty('useBackedupDir')) {
    return importConfig.useBackedupDir;
  }

  let backupDirPath: string;
  const subDir = isSubDirectory(importConfig);

  if (subDir) {
    backupDirPath = path.resolve(
      sanitizePath(importConfig.contentDir),
      '..',
      '_backup_' + Math.floor(Math.random() * 1000),
    );
    if (importConfig.createBackupDir) {
      cliux.print(
        `Warning!!! Provided backup directory path is a sub directory of the content directory, Cannot copy to a sub directory. Hence new backup directory created - ${backupDirPath}`,
        {
          color: 'yellow',
        },
      );
    }
  } else {
    // NOTE: If the backup folder's directory is provided, create it at that location; otherwise, the default path (working directory).
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
    return new Promise((resolve, reject) => {
      return copy(importConfig.contentDir, backupDirPath, (error: any) => {
        if (error) {
          trace(error, 'error', true);
          return reject(error);
        }
        resolve(backupDirPath);
      });
    });
  }
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
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  // true if both parent and child have same path
  return true;
}
