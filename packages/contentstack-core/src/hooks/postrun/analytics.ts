import { logger } from '@contentstack/utilities';
import { Analytics, getSessionId } from '../../utils';
import configInternal from '../../config';

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
    if (result.status !== 200) {
      return logger.error(`Error in analytics capture plugin ${plugin.name}`);
    }
    logger.debug(`Analytics captured plugin ${plugin.name}`);
  } catch (error) {
    logger.error(`Error in analytics capture plugin ${plugin.name}`, error);
  }
}
