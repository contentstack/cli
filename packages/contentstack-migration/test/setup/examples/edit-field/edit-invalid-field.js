module.exports = migration => {
  const blog = migration.editContentType('blog');

  blog.editField('_uniqueid')
    .display_name('Unique Id')
    .mandatory(false);
};