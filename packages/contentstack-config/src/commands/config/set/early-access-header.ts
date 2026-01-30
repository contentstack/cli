import { cliux, flags, configHandler, FlagInput, handleAndLogError } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { Command } from '@contentstack/cli-command';

export default class SetEarlyAccessHeaderCommand extends Command {
  static description = 'Set Early Access header';
  static aliases: string[] = ['config:set:ea-header'];
  static flags: FlagInput = {
    'header-alias': flags.string({ description: '(optional) Provide the Early Access header value.' }),
    header: flags.string({ description: '(optional) Provide the Early Access header alias name.' }),
  };
  static examples: string[] = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> --header <value> --header-alias <value>',
  ];

  async run() {
    try {
      let {
        flags: { header: earlyAccessHeader, 'header-alias': earlyAccessHeaderAlias },
      } = await this.parse(SetEarlyAccessHeaderCommand);
      if (!earlyAccessHeaderAlias) {
        earlyAccessHeaderAlias = (await interactive.askEarlyAccessHeaderAlias())?.trim();
      }
      if (!earlyAccessHeader) {
        earlyAccessHeader = (await interactive.askEarlyAccessHeaderValue())?.trim();
      }
      configHandler.set(`earlyAccessHeaders.${earlyAccessHeaderAlias}`, earlyAccessHeader);
      cliux.success(`Early Access header has been successfully set`);
    } catch (error) {
      handleAndLogError(error, { module: 'config-set-early-access-header' });
    }
  }
}
