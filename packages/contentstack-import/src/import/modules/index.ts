import { FsUtility } from '@contentstack/cli-utilities';
import { join } from 'node:path';
import { ModuleClassParams } from '../../types';
import startJSModuleImport from '../modules-js';

export default async function startModuleImport(modulePayload: ModuleClassParams) {
  const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
  const moduleRunner = new ModuleRunner(modulePayload);
  return moduleRunner.start();
}
