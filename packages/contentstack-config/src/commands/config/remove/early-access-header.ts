import { cliux, flags, configHandler, FlagInput } from '@contentstack/cli-utilities';
import { interactive } from '../../../utils';
import { Command } from '@contentstack/cli-command';

export default class RemoveEarlyAccessHeader extends Command {
  static description = 'Remove early access header';
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
        cliux.error(`No early access header set for alias : ${earlyAccessHeaderAlias}`);
        return;
      }
      if (!skipConfirmation) {
        const confirmation = await interactive.askConfirmation();
        if (!confirmation) {
          return;
        }
      }
      configHandler.delete(`earlyAccessHeaders.${earlyAccessHeaderAlias}`);
      cliux.success(`Removed early access header '${earlyAccessHeaderAlias}' successfully`);
    } catch (error) {
      this.log('Failed to remove the early access header config', error instanceof Error ? error.message : error);
    }
  }
}
