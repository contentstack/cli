import * as path from 'path';
import { copy } from 'fs-extra';

import { fileHelper } from './index';
import { ImportConfig } from '../types';

export default function setupBackupDir(importConfig: ImportConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir')) {
      return resolve(importConfig.useBackedupDir);
    }

    const backupDir = importConfig.createBackupDir ? importConfig.createBackupDir : process.cwd();
    const subDir = isSubDirectory(importConfig.contentDir, backupDir);
    let backupDirPath: string;

    if (subDir) {
      //NOTE: If the backup folder's directory is provided, create it at that location; otherwise, the default path (working directory).
      backupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
      if (importConfig.createBackupDir) {
        if (fileHelper.fileExistsSync(importConfig.createBackupDir)) {
          fileHelper.removeDirSync(importConfig.createBackupDir);
        }
        fileHelper.makeDirectory(importConfig.createBackupDir);
        backupDirPath = importConfig.createBackupDir;
      }
    } else {
      backupDirPath = path.join('..', process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
    }

    if (backupDirPath) {
      return copy(importConfig.contentDir, backupDirPath, (error: any) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    }
  });
}

function isSubDirectory(parent: string, child: string) {
  const relative = path.relative(parent, child);
  if (relative) {
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  } else {
    return false;
  }
}
