import path from 'path';
import { ExportConfig } from '../types';
import { makeDirectory } from './file-helper';
import { sanitizepath } from '@contentstack/cli-utilities';

export default async function setupExportDir(exportConfig: ExportConfig) {
  makeDirectory(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(
      exportConfig.branches.map((branch) => makeDirectory(path.join(sanitizepath(exportConfig.exportDir), sanitizepath(branch.uid)))),
    );
  }
}
