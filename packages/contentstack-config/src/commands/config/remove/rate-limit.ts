import { cliux, configHandler, FlagInput, flags } from '@contentstack/cli-utilities';
import { Command } from '@contentstack/cli-command';
import { askOrgID } from '../../../utils/interactive';

export default class RateLimitRemoveCommand extends Command {
  static description: string = 'Remove rate-limit of the organization';

  static flags: FlagInput = {
    org: flags.string({
      description: 'Provide the organization UID',
    }),
  };
  static examples = ['$ csdx config:remove:rate-limit --org <<org_uid>>'];
  async run() {
    try {
      const { flags } = await this.parse(RateLimitRemoveCommand);
      let { org } = flags;
      if (!org) {
        org = await askOrgID();
      }
      const rateLimit = configHandler.get('rateLimit') || {};

      if (!rateLimit[org]) {
        cliux.print(`No rate limit found for the organization UID: ${org}`, { color: 'red' });
        return;
      }
      configHandler.delete(`rateLimit.${org}`);
      cliux.print(`Rate limit entry for organization UID ${org} has been removed.`, { color: 'green' });
    } catch (error) {
      this.log('Unable to remove the rate limit entry', error instanceof Error ? error.message : error);
    }
  }
}
