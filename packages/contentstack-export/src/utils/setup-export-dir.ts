import path from 'path';
import mkdirp from 'mkdirp';

export default async function setupExportDir(exportConfig) {
  mkdirp.sync(exportConfig.exportDir);
  if (exportConfig.branches) {
    return Promise.all(exportConfig.branches.map((branch) => mkdirp(path.join(exportConfig.exportDir, branch.uid))));
  }
}
