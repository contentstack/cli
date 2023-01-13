import ExportAssets from './assets';

async function startModuleExport(modulePayload) {
  try {
    const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
    const moduleRunner = new ModuleRunner(modulePayload);
    return moduleRunner.start();
  } catch (error) {
    console.log('error', error);
  }
}

export { ExportAssets };
export default startModuleExport;
