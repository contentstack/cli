module.exports = migration => {
  const blog = migration.editContentType('blog');

  blog.editField('main_change_kia')
    .display_name('Blog hello')
    .mandatory(false);
    
    blog.editField('category')
    .display_name('Blog hello')
    .mandatory(false);

    blog.createField('credits')
      .display_name('Credits')
      .data_type('text')
      .mandatory(false);

      migrations.deleteContentType('foo2');

};