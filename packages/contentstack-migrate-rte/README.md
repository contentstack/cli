@contentstack/cli-cm-migrate-rte
==========================

It is Contentstack’s CLI plugin to migrate rte. Using this command, you can copy existing value of HTML RTE into JSON RTE.


<!-- toc -->
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
@contentstack/cli-cm-migrate-rte/1.0.5 darwin-x64 node-v12.22.5
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)
* [`csdx help [COMMAND]`](#csdx-help-command)

## `csdx cm:entries:migrate-html-rte`

Migration script for migrating HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:entries:migrate-html-rte

OPTIONS
  -a, --alias=alias              Alias for the management token to be used
  -c, --config-path=config-path  Path to config file to be used
  -y, --yes                      Agree to process the command with the current configuration
  --content-type=content-type    The content-type from which entries need to be migrated
  --delay=delay                  [default: 1000] Provide delay in ms between two entry update

  --global-field                 This flag is set to false by default. It indicates that current content-type is
                                 global-field

  --html-path=html-path          Provide path of HTML RTE to migrate

  --json-path=json-path          Provide path of JSON RTE to migrate

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

_See code: [src/commands/cm/entries/migrate-html-rte.js](https://github.com/contentstack/cli/blob/v1.0.5/src/commands/cm/entries/migrate-html-rte.js)_

## `csdx help [COMMAND]`

display help for csdx

```
USAGE
  $ csdx help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_
<!-- commandsstop -->
