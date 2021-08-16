'use strict';

module.exports = migration => {
  const blog = migration.editContentType('blog');

  blog.moveField('_uniqueid').toTheBottom();
  // blog.moveField('references').beforeField('author_name');
  // blog.moveField('author').toTheTop();
  // blog.moveField('url').afterField('author');
};