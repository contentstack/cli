import {
  cliux,
  messageHandler,
  managementSDKInitiator,
  marketplaceSDKInitiator,
} from '@contentstack/cli-utilities';
import { CsdxContext } from '../../utils';

/**
 * When an invalid command is corrected (e.g. loginasda → login), init ran with the invalid
 * command so context.messageFilePath was never set. Re-build context and re-init utilities
 * for the actual command so i18n prompts show human-readable text.
 */
export default async function (opts: {
  Command?: { id?: string };
  config?: any;
}): Promise<void> {
  const config = opts?.config ?? this.config;
  const commandId = opts?.Command?.id;
  if (!config?.context?.messageFilePath && commandId) {
    config.context = new CsdxContext({ id: commandId }, config);
    messageHandler.init(config.context);
    cliux.init(config.context);
    managementSDKInitiator.init(config.context);
    marketplaceSDKInitiator.init(config.context);
  }
}
