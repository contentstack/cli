# @contentstack/cli-cm-migrate-rte

It is Contentstack’s CLI plugin to migrate rte. Using this command, you can copy existing value of HTML RTE into JSON RTE.

<!-- toc -->
* [@contentstack/cli-cm-migrate-rte](#contentstackcli-cm-migrate-rte)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-migrate-rte
$ csdx COMMAND
running command...
$ csdx (-v|--version|version)
@contentstack/cli-cm-migrate-rte/1.1.3 darwin-x64 node-v18.12.1
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)

## `csdx cm:entries:migrate-html-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:entries:migrate-html-rte

OPTIONS
  -a, --alias=alias              Alias(name) for the management token
  -c, --config-path=config-path  Path to config file
  -y, --yes                      Agree to process the command with the current configuration
  --batch-limit=batch-limit      [default: 50] Provide batch limit for updating entries
  --content-type=content-type    The content type from which entries will be migrated
  --delay=delay                  [default: 1000] Provide delay in ms between two entry update

  --global-field                 This flag is set to false by default. It indicates that current content type is a
                                 globalfield

  --html-path=html-path          Provide path of HTML RTE to migrate

  --json-path=json-path          Provide path of JSON RTE to migrate

  --locale=locale                The locale from which entries will be migrated

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage
  csdx cm:entries:migrate-html-rte --config-path path/to/config.json

  Using Flags
  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path 
  json-path

  Nested RTE
  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path 
  modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid

  csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid 
  --json-path group_uid.json_rte_uid

  Global Field
  csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path 
  --json-path json-path
```

_See code: [src/commands/cm/entries/migrate-html-rte.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-migrate-rte/src/commands/cm/entries/migrate-html-rte.js)_
<!-- commandsstop -->
