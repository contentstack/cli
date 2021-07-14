import { logger, messageHandler, cliux } from '@contentstack/cli-utilities';

/**
 * Initialize the utilities
 */
export default function (opts): void {
  logger.init(this.config.context);
  messageHandler.init(this.config.context);
  cliux.init(this.config.context);
}
