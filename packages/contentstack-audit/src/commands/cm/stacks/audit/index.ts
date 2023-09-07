import { BaseCommand } from '../../../../base-command';

export default class Audit extends BaseCommand<typeof Audit> {
  static aliases: string[] = ['cm:stacks:audit'];

  static description = 'Audit and find possible errors in the exported data';

  static examples = ['$ <%= config.bin %> <%= command.id %>'];

  static flags = {};

  async run(): Promise<void> {}
}
