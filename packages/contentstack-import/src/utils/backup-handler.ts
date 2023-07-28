import * as path from 'path';
import ncp from 'ncp';

import { ImportConfig } from '../types';
import { fileHelper } from './index';

export default function setupBackupDir(importConfig: ImportConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir')) {
      return resolve(importConfig.useBackedupDir);
    }

    //NOTE: If the backup folder's directory is provided, create it at that location; otherwise, the default path (working directory).
    let backupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
    if (importConfig.createBackupDir) {
      if (!fileHelper.fileExistsSync(importConfig.createBackupDir)) {
        fileHelper.makeDirectory(importConfig.createBackupDir);
      }
      backupDirPath = importConfig.createBackupDir;
    }

    const limit = importConfig.backupConcurrency || 16;
    if (path.isAbsolute(importConfig.contentDir)) {
      return ncp(importConfig.contentDir, backupDirPath, { limit }, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    } else {
      ncp(importConfig.contentDir, backupDirPath, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    }
  });
}
