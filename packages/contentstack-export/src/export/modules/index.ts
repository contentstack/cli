import { handleAndLogError } from '@contentstack/cli-utilities';
import { ModuleClassParams } from '../../types';
import '../../utils/progress-strategy-registry';

export default async function startModuleExport(modulePayload: ModuleClassParams) {
  try {
    const { default: ModuleRunner } = await import(`./${modulePayload.moduleName}`);
    const moduleRunner = new ModuleRunner(modulePayload);
    return moduleRunner.start();
  } catch (error) {
    handleAndLogError(error, {
      ...modulePayload.exportConfig.context,
      module: modulePayload.moduleName,
    });
    throw error; 
  }
}

export { default as ExportAssets } from './assets';
