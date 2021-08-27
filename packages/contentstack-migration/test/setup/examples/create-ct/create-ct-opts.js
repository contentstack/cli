'use strict'

module.exports = async ({migrations}) => {
  const foo = migrations.createContentType('foo3', {
    title: 'foo3',
    description: 'sample description',
  })
  migrations.addTask(foo.getTaskDefinition())
}
