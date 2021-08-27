'use strict'

module.exports = migrations => {
  const foo = migrations.createContentType('foo1343q12314', {
    title: 'foo1343q12314',
    description: 'sample description',
  })

  foo.createField('title')
  .display_name('Title')
  .data_type('text')
  .mandatory(true)

  foo.createField('url')
  .display_name('URL')
  .data_type('text')
  .mandatory(true)
}
