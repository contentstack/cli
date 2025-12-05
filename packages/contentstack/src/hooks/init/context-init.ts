import { CsdxContext } from '../../utils';
import { configHandler } from '@contentstack/cli-utilities';

/**
 * Set the cli context
 */
export default function (opts): void {
  // Store command ID for session-based log organization
  if (opts.id) {
    configHandler.set('currentCommandId', opts.id);
  }
  this.config.context = new CsdxContext(opts, this.config);
}
