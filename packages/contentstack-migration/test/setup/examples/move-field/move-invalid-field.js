'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.moveField('_uniqueid').toTheBottom()

  migration.addTask(foo.getTaskDefinition())
}
