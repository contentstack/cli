'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3', {
    deschripshion: 'New description',
  })
  migration.addTask(foo.getTaskDefinition())
}
