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
  const ctx = new CsdxContext(opts, this.config);
  this.config.context = ctx;
  // oclif v4 always recreates Config via Config.load(existingConfig), stripping custom
  // properties like `context`. Storing it in options ensures it survives the spread:
  //   new Config({ ...opts.options, plugins }) in Config.load
  (this.config.options as any).context = ctx;
}
