const Analytics = require('../../util/analytics')
const {getUUID} = require('../../util/user-config')
const debug = require('debug')('hooks:analytics')

// eslint-disable-next-line no-warning-comments
// TODO: Add dimensions customDimensions: {
//     os: 'dimension1',
//     'cli-version': 'dimension2',
//   },

/**
 * This hook gets UUID for Analytics to maintain uniqueness of user and run before every command gets executed.
 */
let uuid = getUUID()
const googleAnalyticsConf = {
  trackingID: 'UA-169821045-2',
  cid: uuid,
}

const analytics = new Analytics({
  trackingID: googleAnalyticsConf.trackingID,
  cid: googleAnalyticsConf.cid,
})

/**
 *
 * @param {Object} opts Options provided to hooks via Oclif framework.
 */
module.exports = async function (opts) {
  const plugin = opts.Command.plugin
  let result = await analytics.track(opts.Command.id, {
    category: `${plugin.name}`,
    label: `${this.config.version}`,
    os: `${this.config.userAgent}`,
  })
  debug('Analytics captured', result.status)
  if (typeof result === Error) {
    debug('Failed to send analytics.', result)
  }
}
