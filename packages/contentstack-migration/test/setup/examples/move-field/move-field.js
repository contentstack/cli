'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.moveField('twitter_link')
  .afterField('facebook_link')

  foo.moveField('title')
  .toTheTop()
  migration.addTask(foo.getTaskDefinition())
}
