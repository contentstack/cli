module.exports = migration => {
  const blog = migration.editContentType('blog');

  blog.deleteField('test_field');
};