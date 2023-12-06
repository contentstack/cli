# @contentstack/cli-cm-migrate-rte

It is Contentstack’s CLI plugin to migrate rte. Using this command, you can copy existing value of HTML RTE into JSON RTE.

<!-- toc -->

- [@contentstack/cli-cm-migrate-rte](#contentstackcli-cm-migrate-rte)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @contentstack/cli-cm-migrate-rte
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-migrate-rte/1.4.15 darwin-arm64 node-v20.8.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)
- [`csdx cm:migrate-rte`](#csdx-cmmigrate-rte)

## `csdx cm:entries:migrate-html-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:entries:migrate-html-rte [-c <value>] [-a <value>] [--stack-api-key <value>] [--content-type <value>]
    [--global-field] [-y] [--branch <value>] [--html-path <value> --json-path <value>] [--delay <value>] [--locale
    <value>] [--batch-limit <value>]

FLAGS
  -a, --alias=<value>        Alias(name) for the management token
  -c, --config-path=<value>  Path to config file
  -y, --yes                  Agree to process the command with the current configuration
  --batch-limit=<value>      [default: 50] Provide batch limit for updating entries
  --branch=<value>           [optional] branch name
  --content-type=<value>     The content type from which entries will be migrated
  --delay=<value>            [default: 1000] Provide delay in ms between two entry update
  --global-field             This flag is set to false by default. It indicates that current content type is a
                             globalfield
  --html-path=<value>        Provide path of HTML RTE to migrate
  --json-path=<value>        Provide path of JSON RTE to migrate
  --locale=<value>           The locale from which entries will be migrated
  --stack-api-key=<value>    Stack api key to be used

DESCRIPTION
  Migration script to migrate content from HTML RTE to JSON RTE

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage

  $ csdx cm:entries:migrate-html-rte --config-path path/to/config.json



  Using Flags

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path json-path



  Nested RTE

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid



  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid --json-path group_uid.json_rte_uid



  Global Field

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path --json-path json-path
```

_See code: [src/commands/cm/entries/migrate-html-rte.js](https://github.com/contentstack/cli/blob/main/packages/contentstack-migrate-rte/src/commands/cm/entries/migrate-html-rte.js)_

## `csdx cm:migrate-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:migrate-rte [-c <value>] [-a <value>] [--stack-api-key <value>] [--content-type <value>]
    [--global-field] [-y] [--branch <value>] [--html-path <value> --json-path <value>] [--delay <value>] [--locale
    <value>] [--batch-limit <value>]

FLAGS
  -a, --alias=<value>        Alias(name) for the management token
  -c, --config-path=<value>  Path to config file
  -y, --yes                  Agree to process the command with the current configuration
  --batch-limit=<value>      [default: 50] Provide batch limit for updating entries
  --branch=<value>           [optional] branch name
  --content-type=<value>     The content type from which entries will be migrated
  --delay=<value>            [default: 1000] Provide delay in ms between two entry update
  --global-field             This flag is set to false by default. It indicates that current content type is a
                             globalfield
  --html-path=<value>        Provide path of HTML RTE to migrate
  --json-path=<value>        Provide path of JSON RTE to migrate
  --locale=<value>           The locale from which entries will be migrated
  --stack-api-key=<value>    Stack api key to be used

DESCRIPTION
  Migration script to migrate content from HTML RTE to JSON RTE

ALIASES
  $ csdx cm:migrate-rte

EXAMPLES
  General Usage

  $ csdx cm:entries:migrate-html-rte --config-path path/to/config.json



  Using Flags

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path json-path



  Nested RTE

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid



  $ csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid --json-path group_uid.json_rte_uid



  Global Field

  $ csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path --json-path json-path
```

<!-- commandsstop -->
