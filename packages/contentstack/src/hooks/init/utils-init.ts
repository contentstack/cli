import { logger, messageHandler, cliux, CLIError } from '@contentstack/cli-utilities';

/**
 * Initialize the utilities
 */
export default function (opts): void {
  // console.log("Context", this.config.context);
  logger.init(this.config.context);
  messageHandler.init(this.config.context);
  cliux.init(this.config.context);
}
