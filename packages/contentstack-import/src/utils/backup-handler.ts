import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as ncp from 'ncp';
import * as fs from 'fs';

export default function setupBackupDir(context, importConfig): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (importConfig.hasOwnProperty('useBackedupDir') && fs.existsSync(importConfig.useBackedupDir)) {
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
