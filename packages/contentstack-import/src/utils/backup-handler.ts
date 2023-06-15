import * as path from 'path';
import ncp from 'ncp';

export default function setupBackupDir(importConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir')) {
      return resolve(importConfig.useBackedupDir);
    }
    const backupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
    ncp.limit = importConfig.backupConcurrency || 16;
    if (path.isAbsolute(importConfig.contentDir)) {
      return ncp(importConfig.contentDir, backupDirPath, (error) => {
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
