'use strict'

module.exports = migrations => {
  const foo = migrations.createContentType('foo')
  .title('foo')
  .description('Sample description')

  foo.createField('title')
  .mandatory(true)

  foo.createField('url')
  .mandatory(true)
}
