export default async function startModuleImport(modulePayload) {
  const { moduleName, importConfig, stackAPIClient } = modulePayload;
  const { default: ModuleRunner } = await import(`./${moduleName}`);
  const moduleRunner = new ModuleRunner(importConfig, stackAPIClient);
  return moduleRunner.start();
}
