'use strict';

module.exports = migrations => {
  const foo = migrations.editContentType('foo1');

  foo.description('Edited description');
};

