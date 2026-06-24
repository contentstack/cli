import { Help } from '@oclif/core';
import { BaseCommand } from '../../base-command';
import { CLITable, FlagInput } from '@contentstack/cli-utilities';

export default class TokensCommand extends BaseCommand<typeof TokensCommand> {
  static description = 'Manage authentication tokens for API access';
  static strict = false;

  static examples = [
    '$ csdx tokens:list',
    '$ csdx tokens:add --alias mytoken',
    '$ csdx tokens:remove --alias mytoken',
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
    await this.parse(TokensCommand, this.argv.filter((a) => a !== '-help'));
    const cmd = this.config.findCommand('tokens');
    if (cmd) await new Help(this.config).showCommandHelp(cmd);
  }
}
