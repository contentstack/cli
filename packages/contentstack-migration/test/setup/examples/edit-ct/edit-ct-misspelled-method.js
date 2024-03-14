'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo')
  foo.deschripshion('new deschripshion')
  migration.addTask(foo.getTaskDefinition())
}
