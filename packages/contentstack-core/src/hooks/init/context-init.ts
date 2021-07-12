import { CsdxContext } from '../../utils';

/**
 * Set user configuration in the settings
 * TBD: will be removed since command class is providing the same features
 */
export default function (opts): void {
  this.config.context = new CsdxContext(opts);
}
