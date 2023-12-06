@contentstack/cli-cm-import

It is Contentstack’s CLI plugin to import content in the stack. To learn how to export and import content in Contentstack, refer to the [Migration guide](https://www.contentstack.com/docs/developers/cli/migration/).

[![License](https://img.shields.io/npm/l/@contentstack/cli)](https://github.com/contentstack/cli/blob/main/LICENSE)it -m 

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

For switching to EU region update the hosts at config/default.js

```js
{
  host:'https://eu-api.contentstack.com/v3',
  cdn: 'https://eu-cdn.contentstack.com/v3',
 ...
}
```

For switching to AZURE-NA region update the hosts at config/default.js

```js
{
  host:'https://azure-na-api.contentstack.com/v3',
  cdn: 'https://azure-na-cdn.contentstack.com/v3'
 ...
}
```

For switching to AZURE-EU region update the hosts at config/default.js

```js
{
  host:'https://azure-eu-api.contentstack.com/v3',
  cdn: 'https://azure-eu-cdn.contentstack.com/v3'
 ...
}
```

# Usage

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-import
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-import/1.12.0 darwin-arm64 node-v20.8.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent)
* [`csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`](#csdx-cmstacksimport--c-value--k-value--d-value--a-value---module-value---backup-dir-value---branch-value---import-webhook-status-disablecurrent-1)

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>              [optional] branch name
  -a, --alias=<value>               alias of the management token
  -b, --backup-dir=<value>          [optional] backup directory name when using specific module
  -c, --config=<value>              [optional] path of config file
  -d, --data-dir=<value>            path and location where data is stored
  -k, --stack-api-key=<value>       API key of the target stack
  -m, --module=<value>              [optional] specific module name
  -y, --yes                         [optional] Override marketplace prompts
  --import-webhook-status=<option>  [default: disable] [optional] Webhook state
                                    <options: disable|current>
  --replace-existing                Replaces the existing module in the target stack.
  --skip-existing                   Skips the module exists warning messages.

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --config <path/of/config/dir>

  $ csdx cm:stacks:import --module <single module name>

  $ csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>

  $ csdx cm:stacks:import --alias <management_token_alias>

  $ csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>

  $ csdx cm:stacks:import --branch <branch name>  --yes
```

## `csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>]
    [--branch <value>] [--import-webhook-status disable|current]

FLAGS
  -B, --branch=<value>              [optional] branch name
  -a, --alias=<value>               alias of the management token
  -b, --backup-dir=<value>          [optional] backup directory name when using specific module
  -c, --config=<value>              [optional] path of config file
  -d, --data-dir=<value>            path and location where data is stored
  -k, --stack-api-key=<value>       API key of the target stack
  -m, --module=<value>              [optional] specific module name
  -y, --yes                         [optional] Override marketplace prompts
  --import-webhook-status=<option>  [default: disable] [optional] Webhook state
                                    <options: disable|current>
  --replace-existing                Replaces the existing module in the target stack.
  --skip-existing                   Skips the module exists warning messages.

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --config <path/of/config/dir>

  $ csdx cm:stacks:import --module <single module name>

  $ csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>

  $ csdx cm:stacks:import --alias <management_token_alias>

  $ csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>

  $ csdx cm:stacks:import --branch <branch name>  --yes
```

_See code: [src/commands/cm/stacks/import.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-import/src/commands/cm/stacks/import.ts)_
<!-- commandsstop -->
