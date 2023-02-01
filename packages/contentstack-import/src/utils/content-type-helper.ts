/**
 * Content type utiles
 * schema template
 * remove reference fields
 * suppress mandatory fields
 */

export const schemaTemplate = {
  content_type: {
    title: 'Seed',
    uid: '',
    schema: [
      {
        display_name: 'Title',
        uid: 'title',
        data_type: 'text',
        field_metadata: {
          _default: true,
        },
        unique: false,
        mandatory: true,
        multiple: false,
      },
      {
        display_name: 'URL',
        uid: 'url',
        data_type: 'text',
        field_metadata: {
          _default: true,
        },
        unique: false,
        multiple: false,
      },
    ],
    options: {
      title: 'title',
      publishable: true,
      is_page: true,
      singleton: false,
      sub_title: ['url'],
      url_pattern: '/:title',
      url_prefix: '/',
    },
  },
};

/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

export const suppressSchemaReference = function (schema, flag) {
  for (var i in schema) {
    if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
      suppressSchemaReference(schema[i].schema, flag);
    } else if (schema[i].data_type === 'blocks') {
      for (var block in schema[i].blocks) {
        suppressSchemaReference(schema[i].blocks[block].schema, flag);
      }
    } else if (schema[i].data_type === 'reference') {
      flag.references = true;
    } else if (schema[i].data_type === 'json' && schema[i].field_metadata.rich_text_type) {
      flag.jsonRte = true;
      if (schema[i].field_metadata.embed_entry === true) flag.jsonRteEmbeddedEntries = true;
    }

    if (
      (schema[i].hasOwnProperty('mandatory') && schema[i].mandatory) ||
      (schema[i].hasOwnProperty('unique') && schema[i].unique)
    ) {
      if (schema[i].uid !== 'title') {
        schema[i].unique = false;
        schema[i].mandatory = false;
        flag.suppressed = true;
      }
    }
  }
};

export const removeReferenceFields = function (schema, flag) {
  for (let i = 0; i < schema.length; i++) {
    if (schema[i].data_type === 'group') {
      removeReferenceFields(schema[i].schema, flag);
    } else if (schema[i].data_type === 'blocks') {
      for (var block in schema[i].blocks) {
        removeReferenceFields(schema[i].blocks[block].schema, flag);
      }
    } else if (schema[i].data_type === 'reference') {
      flag.supressed = true;
      schema.splice(i, 1);
      --i;
      if (schema.length < 1) {
        schema.push({
          data_type: 'text',
          display_name: 'dummyTest',
          uid: 'dummy_test',
          field_metadata: {
            description: '',
            default_value: '',
            version: 3,
          },
          format: '',
          error_messages: {
            format: '',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        });
      }
    } else if (
      // handling entry references in json rte
      schema[i].data_type === 'json' &&
      schema[i].field_metadata.rich_text_type &&
      schema[i].field_metadata.embed_entry &&
      schema[i].reference_to.length > 1
    ) {
      flag.supressed = true;
      schema[i].reference_to = ['sys_assets'];
    }
  }
};
