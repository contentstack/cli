import path from 'path';
import { makeDirectory } from './file-helper';

export default async function setupExportDir(exportConfig) {
  makeDirectory(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(
      exportConfig.branches.map((branch) => makeDirectory(path.join(exportConfig.exportDir, branch.uid))),
    );
  }
}
