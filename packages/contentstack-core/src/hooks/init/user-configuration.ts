import { UserConfig } from '../../utils';

/**
 * Set user configuration in the settings
 * TBD: will be removed since command class is providing the same features
 */
export default function (): void {
  this.config.userConfig = new UserConfig();
}
