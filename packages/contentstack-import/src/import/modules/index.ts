import { FsUtility } from '@contentstack/cli-utilities';
import { join } from 'node:path';
import { ModuleClassParams } from '../../types';
import startJSModuleImport from '../modules-js';

export default async function startModuleImport(modulePayload: ModuleClassParams) {
  // Todo: Remove below code when auto detect mechanism implemented for old and new module
  if (
    modulePayload.moduleName === 'assets' &&
    !new FsUtility({ basePath: join(modulePayload.importConfig?.backupDir, 'assets') }).isNewFsStructure
  ) {
    return startJSModuleImport(modulePayload);
  }
  const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
  const moduleRunner = new ModuleRunner(modulePayload);
  return moduleRunner.start();
}
