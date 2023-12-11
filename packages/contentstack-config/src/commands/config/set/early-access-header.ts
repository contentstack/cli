import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { Command } from '@contentstack/cli-command';

export default class SetEarlyAccessHeaderCommand extends Command {
  static description = 'Set early access header';
  static aliases: string[] = ['config:set:ea-header'];
  static flags: FlagInput = {
    'header-alias': flags.string({ description: 'Alias for the header' }),
    header: flags.string({ description: 'Early access header value' }),
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
        earlyAccessHeaderAlias = await interactive.askEarlyAccessHeaderAlias();
      }
      if (!earlyAccessHeader) {
        earlyAccessHeader = await interactive.askEarlyAccessHeaderValue();
      }
      configHandler.set(`earlyAccessHeaders.${earlyAccessHeaderAlias}`, earlyAccessHeader);
      cliux.success(
        `Early access header '${earlyAccessHeader}' with alias '${earlyAccessHeaderAlias}' is set successfully`,
      );
    } catch (error) {
      this.log('Failed to set the early access header config', error instanceof Error ? error.message : error);
    }
  }
}
