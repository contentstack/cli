import { FlagInput, Flags } from '@contentstack/cli-utilities';

import { BaseCommand } from '../../base-command';
import Contentfly from '../../util/cloud-function';

export default class Functions extends BaseCommand<typeof Functions> {
  static description = 'Serve cloud functions';

  static examples = [
    '$ csdx launch:functions',
    '$ csdx launch:functions --port=port',
    '$ csdx launch:functions --data-dir <path/of/current/working/dir>',
    '$ csdx launch:functions --config <path/to/launch/config/file>',
    '$ csdx launch:functions --data-dir <path/of/current/working/dir> -p "port number"',
    '$ csdx launch:functions --config <path/to/launch/config/file> --port=port',
  ];

  static flags: FlagInput = {
    port: Flags.string({
      char: 'p',
      default: '3000',
      description: 'Port number',
    }),
  };

  async run(): Promise<void> {
    this.sharedConfig.config =
      this.flags['data-dir'] || this.flags.config
        ? this.flags.config?.split(`${this.sharedConfig.configName}`)[0] || this.flags['data-dir']
        : process.cwd();
    await new Contentfly(this.sharedConfig.config as string).serveCloudFunctions(+this.flags.port);
  }
}
