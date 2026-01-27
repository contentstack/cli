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
$ csdx (--version)
@contentstack/cli-cm-migrate-rte/1.6.4 darwin-arm64 node-v24.13.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:entries:migrate-html-rte`](#csdx-cmentriesmigrate-html-rte)
* [`csdx cm:migrate-rte`](#csdx-cmmigrate-rte)

## `csdx cm:entries:migrate-html-rte`

Migration script to migrate content from HTML RTE to JSON RTE

```
USAGE
  $ csdx cm:entries:migrate-html-rte [-c <value>] [-a <value>] [--stack-api-key <value>] [--content-type <value>]
    [--global-field] [-y] [--branch <value>] [--html-path <value> --json-path <value>] [--delay <value>] [--locale
    <value>] [--batch-limit <value>]

FLAGS
  -a, --alias=<value>          Enter the alias name. You must use either the --alias flag or the --stack-api-key flag.
  -c, --config-path=<value>    Specify the path where your config file is located.
  -y, --yes                    Avoids reconfirmation of your configuration.
      --batch-limit=<value>    [default: 50] Provide batch limit for updating entries (default: 50).
      --branch=<value>         The name of the branch to be used.
      --content-type=<value>   Specify the UID of the content type for which you want to migrate HTML RTE content.
      --delay=<value>          [default: 1000] To set the interval time between the migration of HTML RTE to JSON RTE in
                               subsequent entries of a content type. The default value is 1,000 milliseconds.
      --global-field           Checks whether the specified UID belongs to a content type or a global field. This flag
                               is set to false by default.
      --html-path=<value>      Enter the path to the HTML RTE whose content you want to migrate.
      --json-path=<value>      Enter the path to the JSON RTE to which you want to migrate the HTML RTE content.
      --locale=<value>         The locale from which entries will be migrated.
      --stack-api-key=<value>  API key of the source stack. You must use either the --stack-api-key flag or the --alias
                               flag.

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
  -a, --alias=<value>          Enter the alias name. You must use either the --alias flag or the --stack-api-key flag.
  -c, --config-path=<value>    Specify the path where your config file is located.
  -y, --yes                    Avoids reconfirmation of your configuration.
      --batch-limit=<value>    [default: 50] Provide batch limit for updating entries (default: 50).
      --branch=<value>         The name of the branch to be used.
      --content-type=<value>   Specify the UID of the content type for which you want to migrate HTML RTE content.
      --delay=<value>          [default: 1000] To set the interval time between the migration of HTML RTE to JSON RTE in
                               subsequent entries of a content type. The default value is 1,000 milliseconds.
      --global-field           Checks whether the specified UID belongs to a content type or a global field. This flag
                               is set to false by default.
      --html-path=<value>      Enter the path to the HTML RTE whose content you want to migrate.
      --json-path=<value>      Enter the path to the JSON RTE to which you want to migrate the HTML RTE content.
      --locale=<value>         The locale from which entries will be migrated.
      --stack-api-key=<value>  API key of the source stack. You must use either the --stack-api-key flag or the --alias
                               flag.

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
