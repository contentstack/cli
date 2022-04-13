'use strict';

module.exports = ({ migration }) => {
  // Clean up
  const foo = migration.deleteContentType('foo3');
  migration.addTask(foo.getTaskDefinition());
};
