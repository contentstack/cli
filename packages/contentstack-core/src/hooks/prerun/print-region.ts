import * as Configstore from 'configstore';
import { cliux } from '@contentstack/utilities';

const config = new Configstore('contentstack_cli');

export default async function (opts): Promise<void> {
  if (opts.Command.id !== 'config:get:region') {
    const region = config.get('region');
    if (!region) {
      cliux.error('No region found, please set a region');
      this.exit();
      return;
    }
    cliux.print(`Currently using ${region.name} region`, { color: 'grey' });
  }
}
