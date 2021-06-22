import * as Configstore from 'configstore';
import { Analytics, getUUID, logger } from '../../utils';

const config = new Configstore('contentstack_cli');
/**
 * This hook gets UUID for Analytics to maintain uniqueness of user and run before every command gets executed.
 */
const sessionId = getUUID();
const googleAnalyticsConf = {
  trackingID: 'UA-169821045-2',
  cid: sessionId,
};

const analytics = new Analytics({
  trackingID: googleAnalyticsConf.trackingID,
  cid: googleAnalyticsConf.cid,
});

/**
 * @param {Object} opts Options provided to hooks via Oclif framework.
 */
export default async function (opts): Promise<any> {
  if (!config.get('analytics.enabled')) {
    logger.debug('Analytics not enabled for session', sessionId);
    return;
  }

  const plugin = opts.Command.plugin;
  try {
    const result = await analytics.track(opts.Command.id, {
      category: `${plugin.name}`,
      label: `${this.config.version}`,
      os: `${this.config.userAgent}`,
    });
    logger.debug(`Analytics captured plugin ${plugin}`, result);
  } catch (error) {
    logger.error(`Error in analytics capture plugin ${plugin}`, error);
  }
}
