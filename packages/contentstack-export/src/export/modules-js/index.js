export default async function startModuleExport(modulePayload) {
  const { moduleName, exportConfig, stackAPIClient } = modulePayload;
  const { default: ModuleRunner } = await import(`./${moduleName}`);
  const moduleRunner = new ModuleRunner(exportConfig, stackAPIClient);
  return moduleRunner.start();
}
