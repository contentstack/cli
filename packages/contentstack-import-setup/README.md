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
$ npm install -g @contentstack/cli-cm-import-setup
$ csdx COMMAND
running command...
$ csdx (--version)
@contentstack/cli-cm-import-setup/1.0.0-beta.0 darwin-arm64 node-v22.2.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`](#csdx-cmstacksimport--k-value--d-value--a-value---modules-valuevalue)
* [`csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`](#csdx-cmstacksimport--k-value--d-value--a-value---modules-valuevalue-1)

## `csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]

FLAGS
  -a, --alias=<value>          alias of the management token
  -d, --data-dir=<value>       path and location where data is stored
  -k, --stack-api-key=<value>  API key of the target stack
  --modules=<option>           [optional] specific module name
                               <options: content-types|entries|both>

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import-setup --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>
```

## `csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`

Import content from a stack

```
USAGE
  $ csdx cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]

FLAGS
  -a, --alias=<value>          alias of the management token
  -d, --data-dir=<value>       path and location where data is stored
  -k, --stack-api-key=<value>  API key of the target stack
  --modules=<option>           [optional] specific module name
                               <options: content-types|entries|both>

DESCRIPTION
  Import content from a stack

ALIASES
  $ csdx cm:import

EXAMPLES
  $ csdx cm:stacks:import-setup --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>
```

_See code: [src/commands/cm/stacks/import-setup.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-import-setup/src/commands/cm/stacks/import-setup.ts)_
<!-- commandsstop -->
