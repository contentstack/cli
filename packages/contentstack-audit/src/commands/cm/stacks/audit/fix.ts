import { BaseCommand } from '../../../../base-command';

export default class AuditFix extends BaseCommand<typeof AuditFix> {
  static description = 'Audit fix command';

  static aliases: string[] = ['cm::stacks:audit:fix'];

  static examples = ['$ <%= config.bin %> <%= command.id %>'];

  static flags = {};

  async run(): Promise<void> {}
}
