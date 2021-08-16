'use strict';

module.exports = migrations => {
  const foo = migrations.editContentType('foo');
  foo.deschripshion('new deschripshion');
};