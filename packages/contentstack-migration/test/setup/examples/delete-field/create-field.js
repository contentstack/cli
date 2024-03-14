module.exports = ({ migration }) => {
  const blog = migration.editContentType('blog');

  blog.createField('test_field');
  migration.addTask(blog.getTaskDefinition());
};
