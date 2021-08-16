module.exports = migration => {
  const blog = migration.editContentType('blog');

  blog.editField('uniqueid')
    .display_name1('Unique Id')
    .mandatory(false);
};