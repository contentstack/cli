'use strict';

module.exports = migrations => {
  const foo = migrations.createContentType('foo', {
    title: 'foo',
    deshcripshion: 'sample desc'
  });
};