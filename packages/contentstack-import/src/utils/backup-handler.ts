import * as path from 'path';
import { copy } from 'fs-extra';
import { cliux, sanitizePath, log } from '@contentstack/cli-utilities';

import { fileHelper, trace } from './index';
import { ImportConfig } from '../types';

export default async function backupHandler(importConfig: ImportConfig): Promise<string> {
  log.debug('Starting backup handler process');
  
  if (importConfig.hasOwnProperty('useBackedupDir')) {
    log.debug(`Using existing backup directory: ${importConfig.useBackedupDir}`);
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
    log.debug(`Detected subdirectory configuration, creating backup at: ${backupDirPath}`);
    
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
    log.debug(`Using default backup directory: ${backupDirPath}`);
    
    if (importConfig.createBackupDir) {
      log.debug(`Custom backup directory specified: ${importConfig.createBackupDir}`);
      
      if (fileHelper.fileExistsSync(importConfig.createBackupDir)) {
        log.debug(`Removing existing backup directory: ${importConfig.createBackupDir}`);
        fileHelper.removeDirSync(importConfig.createBackupDir);
      }
      
      log.debug(`Creating backup directory: ${importConfig.createBackupDir}`);
      fileHelper.makeDirectory(importConfig.createBackupDir);
      backupDirPath = importConfig.createBackupDir;
    }
  }

  if (backupDirPath) {
    log.debug(`Starting content copy to backup directory: ${backupDirPath}`);
    cliux.print('Copying content to the backup directory...');
    
    return new Promise((resolve, reject) => {
      return copy(importConfig.contentDir, backupDirPath, (error: any) => {
        if (error) {
          trace(error, 'error', true);
          return reject(error);
        }
        
        log.debug(`Successfully created backup at: ${backupDirPath}`);
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
  log.debug('Checking if backup directory is a subdirectory');
  
  const parent = importConfig.contentDir;
  const child = importConfig.createBackupDir ? importConfig.createBackupDir : process.cwd();
  const relative = path.relative(parent, child);

  log.debug(`Parent directory: ${parent}, Child directory: ${child}, Relative path: ${relative}`);

  if (relative) {
    const isSubDir = !relative.startsWith('..') && !path.isAbsolute(relative);
    log.debug(`Is subdirectory: ${isSubDir}`);
    return isSubDir;
  }

  // true if both parent and child have same path
  log.debug('Parent and child directories are the same');
  return true;
}
