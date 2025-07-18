/**
 * Global field utiles
 * schema template
 * remove reference fields
 * suppress mandatory fields
 */

export const gfSchemaTemplate = {
    "global_field": {
        "title": "Seed",
        "uid": "",
        "schema": [
            {
            "display_name": "Title",
            "uid": "title",
            "data_type": "text",
            "field_metadata": {
                "_default": true
            },
            "unique": false,
            "mandatory": true,
            "multiple": false
            }
        ],
        "description": ""
    }
  };