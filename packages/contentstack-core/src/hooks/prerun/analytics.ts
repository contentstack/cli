import * as Configstore from 'configstore';
import { Analytics, getSessionId, logger } from '../../utils';
import configInternal from '../../config';

const config = new Configstore('contentstack_cli');

/**
 * @param {Object} opts Options provided to hooks via Oclif framework.
 * This hook gets UUID for Analytics to maintain uniqueness of user and run before every command gets executed.
 */
export default async function (opts): Promise<any> {
  const sessionId = getSessionId();
  const googleAnalyticsConf = {
    trackingID: configInternal.analytics.trackingID,
    cid: sessionId,
  };
  const analytics = new Analytics({
    trackingID: googleAnalyticsConf.trackingID,
    cid: googleAnalyticsConf.cid,
  });
  const plugin = opts.Command.plugin;
  try {
    const result = await analytics.track(opts.Command.id, {
      category: `${plugin.name}`,
      label: `${this.config.version}`,
      os: `${this.config.userAgent}`,
    });
    logger.debug(`Analytics captured plugin ${plugin}`, result);
  } catch (error) {
    console.log('error', error);
    logger.error(`Error in analytics capture plugin ${plugin}`, error);
  }
}
