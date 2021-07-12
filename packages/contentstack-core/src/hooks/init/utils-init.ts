import { logger, messageHandler, cliux, configHandler } from '@contentstack/utilities';

/**
 * Set user configuration in the settings
 * TBD: will be removed since command class is providing the same features
 */
export default function (opts): void {
  logger.init(this.config.context);
  messageHandler.init(this.config.context);
  cliux.init(this.config.context);
}
