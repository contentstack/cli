export default async function startModuleImport(modulePayload) {
  const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
  const moduleRunner = new ModuleRunner(modulePayload);
  return moduleRunner.start();
}
