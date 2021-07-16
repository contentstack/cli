import * as Configstore from 'configstore';
import { CLIError, logger } from '../../utils';

const config = new Configstore('contentstack_cli');

export default async function (data): Promise<boolean> {
  if (!config.has('tokens')) {
    throw new CLIError({
      message: 'No tokens have been added. Please add a token using csdx auth:tokens:add -a [ALIAS]',
    });
  }
  if (!config.get(`tokens.${data.alias}`))
    throw new CLIError({
      message: `The configured management token alias ${data.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${data.alias}'`,
    });

  return true;
}
