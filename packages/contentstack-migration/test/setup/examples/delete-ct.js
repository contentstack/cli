'use strict';

module.exports = migrations => {
  // Clean up
  migrations.deleteContentType('foo2');
};