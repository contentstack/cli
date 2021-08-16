'use strict';

module.exports = async ({ migration, stackSDKInstance }) => {
    const blogUID= 'blog3',
        blogTitle = 'Blog3',
        authorUID= 'author3',
        authorTitle= 'Author3';
        
    const blogEdit = migration.editContentType(blogUID);
    blogEdit.createField('author')
        .data_type('reference')
        .reference_to([authorUID])
        .ref_multiple(false);

    migration.addTask(blogEdit.getTaskDefinition());
}