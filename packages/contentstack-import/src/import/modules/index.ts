export default async function startModuleImport(context, stackAPIClient, importConfig, moduleName) {
  try {
    const { default: ModuleRunner } = await import(`./${moduleName}`);
    const moduleRunner = new ModuleRunner(context, stackAPIClient, importConfig);
    return moduleRunner.start();
  } catch (error) {
    console.log('error', error);
  }
}
