import * as Configstore from 'configstore';
import { cliux } from '../../utils';

const config = new Configstore('contentstack_cli');

export default async function (opts): Promise<void> {
  if (opts.Command.id !== 'config:get:region') {
    const region = config.get('region');
    cliux.print(`Currently using ${region.name} region`, { color: 'grey' });
  }
}
