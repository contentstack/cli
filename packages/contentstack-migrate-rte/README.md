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
* [`csdx cm:migrate-rte`](#csdx-cmmigrate-rte)
* [`csdx help [COMMAND]`](#csdx-help-command)

## `csdx cm:migrate-rte`

Migration script for migrating HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:migrate-rte

OPTIONS
  -a, --alias=alias                Alias for the management token to be used
  -c, --content_type=content_type  The content-type from which entries need to be migrated
  -d, --delay=delay                [default: 1000] Provide delay in ms between two entry update

  -g, --isGlobalField              This flag is set to false by default. It indicates that current content-type is
                                   global-field

  -h, --htmlPath=htmlPath          Provide path of Html RTE to migrate

  -j, --jsonPath=jsonPath          Provide path of JSON RTE to migrate

  -l, --locale=locale              The locale from which entries need to be migrated

  -p, --configPath=configPath      Path to config file to be used

  -y, --yes                        Agree to process the command with the current configuration

EXAMPLES
  General Usage
  csdx cm:migrate-rte -p path/to/config.json

  Using Flags
  csdx cm:migrate-rte -a alias -c content_type_uid -h htmlPath -j jsonPath

  Nested RTE
  csdx cm:migrate-rte -a alias -c content_type_uid -h modular_block_uid.block_uid.html_rte_uid -j 
  modular_block_uid.block_uid.json_rte_uid

  csdx cm:migrate-rte -a alias -c content_type_uid -h group_uid.html_rte_uid -j group_uid.json_rte_uid

  Global Field
  csdx cm:migrate-rte -a alias -c global_field_uid -g -h htmlPath -j jsonPath
```

_See code: [src/commands/cm/migrate-rte/index.js](https://github.com/contentstack/cli/blob/v1.0.5/src/commands/cm/migrate-rte/index.js)_

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
