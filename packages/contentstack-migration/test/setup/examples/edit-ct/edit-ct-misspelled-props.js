'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo', {
    deschripshion: 'New description',
  })
  migration.addTask(foo.getTaskDefinition())
}
