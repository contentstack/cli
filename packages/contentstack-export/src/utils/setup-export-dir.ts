import path from 'path';
import { ExportConfig } from '../types';
import { makeDirectory } from './file-helper';

export default async function setupExportDir(exportConfig: ExportConfig) {
  makeDirectory(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(
      exportConfig.branches.map((branch) => makeDirectory(path.join(exportConfig.exportDir, branch.uid))),
    );
  }
}
