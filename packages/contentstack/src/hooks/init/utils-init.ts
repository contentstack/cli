import { messageHandler, cliux, managementSDKInitiator } from '@contentstack/cli-utilities';

/**
 * Initialize the utilities 
 */
export default function (_opts): void {
  const { context } = this.config;
  // logger.init(context);
  messageHandler.init(context);
  cliux.init(context);
  managementSDKInitiator.init(context);
}
