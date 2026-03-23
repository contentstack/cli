import { messageHandler, cliux, managementSDKInitiator, marketplaceSDKInitiator, loadChalk } from '@contentstack/cli-utilities';

/**
 * Initialize the utilities 
 */
export default async function (_opts): Promise<void> {
  await loadChalk();
  const { context } = this.config;
  messageHandler.init(context);
  cliux.init(context);
  managementSDKInitiator.init(context);
  marketplaceSDKInitiator.init(context);
}
