module.exports = {
  content_types: [
    {
      created_at: '2019-08-16T08:18:56.914Z',
      updated_at: '2019-08-16T08:18:58.736Z',
      title: 'Product',
      uid: 'product',
      _version: 2,
      inbuilt_class: false,
      schema: [
        {
          display_name: 'Title',
          uid: 'title',
          data_type: 'text',
          mandatory: false,
          unique: false,
          field_metadata: {
            _default: true,
            instruction: 'Product Name',
            version: 3,
          },
          multiple: false,
          non_localizable: false,
        },
        {
          display_name: 'URL',
          uid: 'url',
          data_type: 'text',
          mandatory: false,
          field_metadata: {
            _default: true,
            version: 3,
          },
          multiple: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'text',
          display_name: 'Description',
          uid: 'description',
          field_metadata: {
            allow_rich_text: true,
            description: '',
            multiline: false,
            rich_text_type: 'advanced',
            version: 3,
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'number',
          display_name: 'Size (in GB)',
          uid: 'size',
          field_metadata: {
            description: '',
            default_value: '',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'text',
          display_name: 'Color',
          uid: 'color',
          field_metadata: {
            description: '',
            default_value: '',
            version: 3,
          },
          format: '',
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'file',
          display_name: 'Images',
          uid: 'images',
          field_metadata: {
            description: '',
            rich_text_type: 'standard',
            image: true,
          },
          multiple: true,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'reference',
          display_name: 'Categories',
          reference_to: [
            'category',
          ],
          field_metadata: {
            ref_multiple: true,
            ref_multiple_content_types: true,
          },
          uid: 'categories',
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'number',
          display_name: 'Price in USD',
          uid: 'price_in_usd',
          field_metadata: {
            description: '',
            default_value: '',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'reference',
          display_name: 'Brand',
          reference_to: [
            'brand',
          ],
          field_metadata: {
            ref_multiple: false,
            ref_multiple_content_types: true,
          },
          uid: 'brand',
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'isodate',
          display_name: 'Launch Date',
          uid: 'launch_date',
          field_metadata: {
            description: '',
            default_value: '',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          endDate: null,
          startDate: null,
          non_localizable: false,
        },
        {
          data_type: 'boolean',
          display_name: 'instock',
          uid: 'instock',
          field_metadata: {
            description: '',
            default_value: '',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'blocks',
          display_name: 'Additional Info',
          blocks: [
            {
              title: 'Related Products',
              uid: 'related_products',
              schema: [
                {
                  data_type: 'reference',
                  display_name: 'Products',
                  reference_to: [
                    'product',
                  ],
                  field_metadata: {
                    ref_multiple: true,
                    ref_multiple_content_types: true,
                  },
                  uid: 'products',
                  mandatory: false,
                  multiple: false,
                  unique: false,
                  non_localizable: false,
                },
              ],
            },
            {
              title: 'Rating',
              uid: 'rating',
              schema: [
                {
                  data_type: 'number',
                  display_name: 'Stars',
                  display_type: 'dropdown',
                  enum: {
                    advanced: false,
                    choices: [
                      {
                        value: 1,
                      },
                      {
                        value: 2,
                      },
                      {
                        value: 3,
                      },
                      {
                        value: 4,
                      },
                      {
                        value: 5,
                      },
                    ],
                  },
                  multiple: false,
                  uid: 'stars',
                  field_metadata: {
                    description: '',
                    default_value: '',
                  },
                  min_instance: null,
                  max_instance: null,
                  mandatory: false,
                  unique: false,
                  non_localizable: false,
                },
              ],
            },
            {
              title: 'Deals',
              uid: 'deals',
              schema: [
                {
                  data_type: 'text',
                  display_name: 'Deal Name',
                  display_type: 'dropdown',
                  enum: {
                    advanced: false,
                    choices: [
                      {
                        value: 'Summer Deal',
                      },
                      {
                        value: 'Independence Day Deal',
                      },
                      {
                        value: 'Black Friday Deal',
                      },
                      {
                        value: 'Christmas Deal',
                      },
                      {
                        value: 'Deals of the Day',
                      },
                    ],
                  },
                  multiple: false,
                  uid: 'deal_name',
                  field_metadata: {
                    description: '',
                    default_value: '',
                    version: 3,
                  },
                  min_instance: null,
                  max_instance: null,
                  mandatory: false,
                  unique: false,
                  non_localizable: false,
                },
                {
                  data_type: 'text',
                  display_name: 'Deal Details',
                  uid: 'deal_details',
                  field_metadata: {
                    description: '',
                    default_value: '',
                    multiline: true,
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
                },
              ],
            },
          ],
          multiple: true,
          uid: 'additional_info',
          field_metadata: {},
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
        {
          data_type: 'group',
          display_name: 'Bank Offers',
          field_metadata: {},
          schema: [
            {
              data_type: 'reference',
              display_name: 'Bank',
              reference_to: [
                'bank',
              ],
              field_metadata: {
                ref_multiple: false,
                ref_multiple_content_types: true,
              },
              uid: 'bank',
              multiple: false,
              mandatory: false,
              unique: false,
              non_localizable: false,
            },
            {
              data_type: 'text',
              display_name: 'Card Type',
              display_type: 'dropdown',
              enum: {
                advanced: false,
                choices: [
                  {
                    value: 'Credit Card',
                  },
                  {
                    value: 'Debit Card',
                  },
                ],
              },
              multiple: true,
              uid: 'card_type',
              field_metadata: {
                description: '',
                default_value: '',
                version: 3,
              },
              mandatory: false,
              unique: false,
              non_localizable: false,
            },
            {
              data_type: 'number',
              display_name: 'Discount In Percentage',
              uid: 'discount_in_percentage',
              field_metadata: {
                description: '',
                default_value: '',
              },
              multiple: false,
              mandatory: false,
              unique: false,
              non_localizable: false,
            },
          ],
          uid: 'bank_offers',
          multiple: true,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
      ],
      last_activity: {
        environments: [
          {
            uid: 'blta39a4441696e35e0',
            details: [
              {
                locale: 'en-us',
                time: '2019-08-23T13:02:25.439Z',
              },
            ],
          },
        ],
      },
      maintain_revisions: true,
      description: '',
      DEFAULT_ACL: {
        others: {
          read: false,
          create: false,
        },
        users: [
          {
            uid: 'bltb7dc5be19ed72dd9',
            read: true,
            sub_acl: {
              read: true,
            },
          },
        ],
      },
      SYS_ACL: {
        roles: [
          {
            uid: 'blt70c41dfd00924e9f',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
            update: true,
            delete: true,
          },
          {
            uid: 'blt954756afc76573d1',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
            update: true,
            delete: true,
          },
          {
            uid: 'blt5c82a78624ed860d',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
          },
        ],
        others: {
          read: false,
          create: false,
          update: false,
          delete: false,
          sub_acl: {
            read: false,
            create: false,
            update: false,
            delete: false,
            publish: false,
          },
        },
      },
      options: {
        is_page: true,
        singleton: false,
        title: 'title',
        sub_title: [],
        url_pattern: '/:title',
        url_prefix: '/mobiles/',
      },
      abilities: {
        get_one_object: true,
        get_all_objects: true,
        create_object: true,
        update_object: true,
        delete_object: true,
        delete_all_objects: true,
      },
    },

    {
      created_at: '2019-08-16T08:18:55.164Z',
      updated_at: '2019-08-16T08:18:58.691Z',
      title: 'Bank',
      uid: 'bank',
      _version: 2,
      inbuilt_class: false,
      schema: [
        {
          display_name: 'Title',
          uid: 'title',
          data_type: 'text',
          mandatory: false,
          unique: false,
          field_metadata: {
            _default: true,
            version: 3,
          },
          multiple: false,
          non_localizable: false,
        },
        {
          data_type: 'file',
          display_name: 'Logo',
          uid: 'logo',
          extensions: [],
          field_metadata: {
            description: '',
            rich_text_type: 'standard',
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
        },
      ],
      last_activity: {},
      maintain_revisions: true,
      description: '',
      DEFAULT_ACL: {
        others: {
          read: false,
          create: false,
        },
        users: [
          {
            uid: 'bltb7dc5be19ed72dd9',
            read: true,
            sub_acl: {
              read: true,
            },
          },
        ],
      },
      SYS_ACL: {
        roles: [
          {
            uid: 'blt70c41dfd00924e9f',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
            update: true,
            delete: true,
          },
          {
            uid: 'blt954756afc76573d1',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
            update: true,
            delete: true,
          },
          {
            uid: 'blt5c82a78624ed860d',
            read: true,
            sub_acl: {
              create: true,
              read: true,
              update: true,
              delete: true,
              publish: true,
            },
          },
        ],
        others: {
          read: false,
          create: false,
          update: false,
          delete: false,
          sub_acl: {
            read: false,
            create: false,
            update: false,
            delete: false,
            publish: false,
          },
        },
      },
      options: {
        is_page: false,
        singleton: false,
        title: 'title',
        sub_title: [],
      },
      abilities: {
        get_one_object: true,
        get_all_objects: true,
        create_object: true,
        update_object: true,
        delete_object: true,
        delete_all_objects: true,
      },
    },
  ],
  count: 2,
};
