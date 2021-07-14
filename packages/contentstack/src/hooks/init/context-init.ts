import { CsdxContext } from '../../utils';

/**
 * Set the cli context
 */
export default function (opts): void {
  this.config.context = new CsdxContext(opts, this.config);
}
