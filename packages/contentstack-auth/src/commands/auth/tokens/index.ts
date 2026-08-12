import { Help } from '@oclif/core';
import { BaseCommand } from '../../../base-command';
import { CLITable, FlagInput } from '@contentstack/cli-utilities';

export default class AuthTokensCommand extends BaseCommand<typeof AuthTokensCommand> {
  static description = 'Manage authentication tokens for API access';
  static strict = false;

  static examples = [
    '$ csdx auth:tokens:list',
    '$ csdx auth:tokens:add --alias mytoken',
    '$ csdx auth:tokens:remove --alias mytoken',
  ];

  static flags: FlagInput = CLITable.getTableFlags([
    'columns',
    'sort',
    'filter',
    'csv',
    'no-truncate',
    'no-header',
    'output',
  ]);

  async run(): Promise<any> {
    await this.parse(AuthTokensCommand, this.argv.filter((a) => a !== '-help' && a !== '-h'));
    const cmd = this.config.findCommand('auth:tokens');
    if (cmd) await new Help(this.config).showCommandHelp(cmd);
  }
}
