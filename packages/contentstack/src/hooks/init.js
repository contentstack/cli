
const {UserConfig} = require('../util/user-config')
const ContentstackClient = require('../util/contentstack-client')
const debug = require('debug')('hooks:init')

module.exports = async function () {
  debug('Showing Contentstack ASCII art')
  // Shows Contentstack graphics
  // cli.log(figlet.textSync('Contentstack', {
  //   horizontalLayout: 'default',
  //   verticalLayout: 'default',
  // }))
  debug('Rendered loading ASCII art')
  // eslint-disable-next-line no-warning-comments
  // TODO: Add this into 'command' class in future when command class is implemented
  // attach user config object which will allow other plugins to access some config methods
  this.config.userConfig = new UserConfig()
  const region = this.config.userConfig.getRegion()
  this.config.contentstackClient = new ContentstackClient(region.cma).instance
  debug('Done loading init hook')
}
