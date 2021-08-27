'use strict'

module.exports = migrations => {
  const foo = migrations.editContentType('foo2')

  foo.description('Edited description')
}
