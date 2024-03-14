module.exports = ({ migration }) => {
  const foo = migration.editContentType('foo3');

  foo.deleteField('facebook_linkss');
  migration.addTask(foo.getTaskDefinition());
};
