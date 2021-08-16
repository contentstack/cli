'use strict';

module.exports = migrations => {
  const foo = migrations.createContentType('foo')
    .title('foo')
    .description('Sample description');

  foo.createField('bar')
    .display_name('bar')
    .data_type('text')
    .mandatory(true);
};