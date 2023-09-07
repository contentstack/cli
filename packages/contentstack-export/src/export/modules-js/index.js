async function startModuleExport(modulePayload) {
  const { moduleName, exportConfig, stackAPIClient } = modulePayload;
  const { default: ModuleRunner } = await import(`./${moduleName}.js`);
  const moduleRunner = new ModuleRunner(exportConfig, stackAPIClient);
  return moduleRunner.start();
}

module.exports = startModuleExport;
