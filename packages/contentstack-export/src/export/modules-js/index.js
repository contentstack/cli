export default async function startModuleExport(modulePayload) {
  try {
    const { moduleName, exportConfig, stackAPIClient } = modulePayload;
    const ModuleRunner = await import(`./${moduleName}`);
    const moduleRunner = new ModuleRunner(exportConfig, stackAPIClient);
    return moduleRunner.start();
  } catch (error) {
    console.log('error', error);
  }
}
