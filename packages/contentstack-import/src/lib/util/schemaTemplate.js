module.exports = {
  'content_type': {
    'title': 'Seed',
    'uid': '',
    'schema': [
      {
        'display_name': 'Title',
        'uid': 'title',
        'data_type': 'text',
        'field_metadata': {
          '_default': true
        },
        'unique': false,
        'mandatory': true,
        'multiple': false
      },
      {
        'display_name': 'URL',
        'uid': 'url',
        'data_type': 'text',
        'field_metadata': {
          '_default': true
        },
        'unique': false,
        'multiple': false
      }
    ],
    'options': {
      'title': 'title',
      'publishable': true,
      'is_page': true,
      'singleton': false,
      'sub_title': [
        'url'
      ],
      'url_pattern': '/:title',
      'url_prefix': '/'
    }
  }
};