'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.moveField('uniqueid').toTheBotto()
  migration.addTask(foo.getTaskDefinition())
}
