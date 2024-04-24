import { ModuleClassParams } from '../../types';

export default async function startModuleImport(modulePayload: ModuleClassParams) {
  const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
  const moduleRunner = new ModuleRunner(modulePayload);
  return moduleRunner.start();
}
