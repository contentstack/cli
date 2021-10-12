export default async function startModuleExport(context, stackAPIClient, exportConfig, moduleName) {
  try {
    const { default: ModuleRunner } = await import(`./${moduleName}`);
    const moduleRunner = new ModuleRunner(context, stackAPIClient, exportConfig);
    return moduleRunner.start();
  } catch (error) {
    console.log('error', error);
  }
}
