'use strict';

module.exports = migrations => {
  const foo = migrations.createContentType('foo')
    .title('foo')
    .description('Sample description');

  foo.createField('title')
    .display_naem('Title')
    .data_tyep('text')
    .mandatory(true);

  foo.createField('url')
    .display_naem('URL')
    .data_tyep('text')
    .mandatory(true);
};