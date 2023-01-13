export default async function startModuleImport(modulePayload) {
  try {
    const { moduleName, importConfig, stackAPIClient } = modulePayload;
    const { default: ModuleRunner } = await import(`./${moduleName}`);
    const moduleRunner = new ModuleRunner(importConfig, stackAPIClient);
    return moduleRunner.start();
  } catch (error) {
    console.log('error', error);
  }
}
