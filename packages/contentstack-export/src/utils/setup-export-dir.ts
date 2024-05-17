import path from 'path';
import { ExportConfig } from '../types';
import { makeDirectory } from './file-helper';
import { sanitizePath } from '@contentstack/cli-utilities';

export default async function setupExportDir(exportConfig: ExportConfig) {
  makeDirectory(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(
      exportConfig.branches.map((branch) => makeDirectory(path.join(sanitizePath(exportConfig.exportDir), sanitizePath(branch.uid)))),
    );
  }
}
