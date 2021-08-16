'use strict';

// module.exports = ({migrations, sdk}) => {
//   const foo = migrations.createContentType('blog5')
//     .title('blog53')
//     .description('This is for another blog');

//   foo.createField('title')
//     .display_name('Title')
//     .data_type('text')
//     .mandatory(true);

//   foo.createField('url')
//     .display_name('URL')
//     .data_type('text')
//     .mandatory(true);

//   foo.createField('url')
//     .display_name('URL')
//     .data_type('text')
//     .mandatory(true);

//   await sdk.contentType('blog5').entry().create({entry: {}})
// };


module.exports = async ({ migration, stackSDKInstance }) => {
  const blogUID= 'blog3',
    blogTitle = 'Blog3',
    authorUID= 'author3',
    authorTitle= 'Author3';

  /**
   * Create Blog content type
   */
  const blog = migration.createContentType(blogUID)
    .title(blogTitle)
    .description('Awesome blogs here');

  blog.createField('title')
    .display_name('Title')
    .data_type('text')
    .mandatory(true);

  blog.createField('url')
    .display_name('URL')
    .data_type('text')
    .mandatory(true);

  blog.createField('author_name')
    .display_name('Author Name')
    .data_type('text')
    .mandatory(true);

  let jsonRTE = {
    "data_type":"text",
    "display_name": "Body",
    "field_metadata": {
      allow_rich_text: true,
      "rich_text_type": "advanced",
      "description": "",
      "default_value": ""
    },
  }
  blog.createField('body', jsonRTE)

  migration.addTask(blog.getTaskDefinition())

  /**
   * add entries to blog content type
   */
  let entries = [];
  let myCustomTask = {
    title: 'Create blog entries',
    successMessage: 'Blog entries added successfully.',
    failedMessage: 'Failed to add Blog entries.',
    tasks: [async (params) => {
      try {
        for (let index = 0; index < 4; index++) {
          let entry = {
            title: `Awesome Blog ${index}`,
            url: `/awesome-log-${index}`,
            body: `This is ${index} blog.`,
            author_name: `Firstname-${index} Lastname-${index}`
          }
          let entryObj = await stackSDKInstance.contentType(blogUID).entry().create({ entry })
          entries.push(entryObj)
        }
      } catch (error) {
        throw error
      }
    }],
    paramsToBind: entries
  }

  migration.addTask(myCustomTask);

};