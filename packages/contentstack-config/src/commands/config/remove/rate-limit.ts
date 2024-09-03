import { cliux, configHandler, FlagInput, flags, isAuthenticated } from '@contentstack/cli-utilities';
import { Command } from '@contentstack/cli-command';
import { askOrgID, handleErrorMsg } from '../../../utils/interactive';

export default class RateLimitRemoveCommand extends Command {

  static flags: FlagInput = {
    org: flags.string({
      description: 'Provide the organization UID',
    }),
  };
  static examples = [
    '$ csdx config:remove:rate-limit --org <<org_uid>>'
  ];
  async run() {
    try {
      if (!isAuthenticated()) {
        const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
        handleErrorMsg(err);
      }
      const { flags } = await this.parse(RateLimitRemoveCommand);
      let { org } = flags;
      if (!org) {
        org = await askOrgID();
      }
      const rateLimits = configHandler.get('rateLimits') || {};

      if (!rateLimits.rateLimit[org]) {
        cliux.print(`No rate limit found for the organization UID: ${org}`, { color: 'red' });
        return;
      }

      delete rateLimits.rateLimit[org];

      configHandler.set('rateLimits', rateLimits);
      cliux.print(`Rate limit entry for organization UID ${org} has been removed.`, { color: 'green' });
    } catch (error) {
      this.log('Unable to remove the rate limit entry', error instanceof Error ? error.message : error);
    }
  }
}
