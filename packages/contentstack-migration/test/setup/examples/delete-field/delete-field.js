module.exports = ({ migration }) => {
  const foo = migration.editContentType('foo3');

  foo.deleteField('facebook_link');
  migration.addTask(foo.getTaskDefinition());
};
