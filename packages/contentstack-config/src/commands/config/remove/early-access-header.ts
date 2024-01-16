import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { Command } from '@contentstack/cli-command';

export default class RemoveEarlyAccessHeader extends Command {
  static description = 'Remove Early Access header';
  static aliases: string[] = ['config:remove:ea-header'];
  static flags: FlagInput = {
    'header-alias': flags.string({ description: 'Early access header alias' }),
    yes: flags.boolean({ char: 'y', description: 'Force Remove' }),
  };
  static examples: string[] = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> --header-alias <value>',
  ];

  async run() {
    try {
      let {
        flags: { 'header-alias': earlyAccessHeaderAlias, yes: skipConfirmation },
      } = await this.parse(RemoveEarlyAccessHeader);
      if (!earlyAccessHeaderAlias) {
        earlyAccessHeaderAlias = await interactive.askEarlyAccessHeaderAlias();
      }
      if (configHandler.get(`earlyAccessHeaders.${earlyAccessHeaderAlias}`) === undefined) {
        cliux.error(`Early Access header not configured for alias: ${earlyAccessHeaderAlias}`);
        return;
      }
      if (!skipConfirmation) {
        const confirmation = await interactive.askConfirmation();
        if (!confirmation) {
          return;
        }
      }
      configHandler.delete(`earlyAccessHeaders.${earlyAccessHeaderAlias}`);
      cliux.success(`Early Access header has been successfully removed`);
    } catch (error) {
      this.log('Unable to remove the Early Access header config', error instanceof Error ? error.message : error);
    }
  }
}
