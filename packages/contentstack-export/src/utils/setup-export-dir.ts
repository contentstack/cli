import * as mkdirp from 'mkdirp';
import * as path from 'path';

export default async function setupExportDir(context, exportConfig) {
  mkdirp.sync(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(exportConfig.branches.map((branch) => mkdirp(path.join(exportConfig.exportDir, branch.uid))));
  }
}
