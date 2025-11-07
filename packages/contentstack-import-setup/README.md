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
@contentstack/cli-cm-import-setup/1.6.1 darwin-arm64 node-v22.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`](#csdx-cmstacksimport-setup--k-value--d-value--a-value---modules-valuevalue)
* [`csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`](#csdx-cmstacksimport-setup--k-value--d-value--a-value---modules-valuevalue)

## `csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`

Helps to generate mappers and backup folder for importing (overwriting) specific modules

```
USAGE
  $ csdx cm:import-setup cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]

FLAGS
  -B, --branch=<value>         The name of the branch where you want to import your content. If you don't mention the
                               branch name, then by default the content will be imported to the main branch.
  -a, --alias=<value>          The management token of the destination stack where you will import the content.
  -d, --data-dir=<value>       The path or the location in your file system where the content, you intend to import, is
                               stored. For example, -d "C:\Users\Name\Desktop\cli\content". If the export folder has
                               branches involved, then the path should point till the particular branch. For example,
                               “-d "C:\Users\Name\Desktop\cli\content\branch_name"
  -k, --stack-api-key=<value>  API key of the target stack
      --branch-alias=<value>   Specify the branch alias where you want to import your content. If not specified, the
                               content is imported into the main branch by default.
      --module=<option>...     [optional] Specify the modules/module to import into the target stack. currently options
                               are global-fields, content-types, entries
                               <options: global-fields|content-types|entries>

DESCRIPTION
  Helps to generate mappers and backup folder for importing (overwriting) specific modules

ALIASES
  $ csdx cm:import-setup

EXAMPLES
  $ csdx cm:stacks:import-setup --stack-api-key <target_stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>

  $ csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name>

  $ csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name> -b <branch_name>
```

## `csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]`

Helps to generate mappers and backup folder for importing (overwriting) specific modules

```
USAGE
  $ csdx cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]

FLAGS
  -B, --branch=<value>         The name of the branch where you want to import your content. If you don't mention the
                               branch name, then by default the content will be imported to the main branch.
  -a, --alias=<value>          The management token of the destination stack where you will import the content.
  -d, --data-dir=<value>       The path or the location in your file system where the content, you intend to import, is
                               stored. For example, -d "C:\Users\Name\Desktop\cli\content". If the export folder has
                               branches involved, then the path should point till the particular branch. For example,
                               “-d "C:\Users\Name\Desktop\cli\content\branch_name"
  -k, --stack-api-key=<value>  API key of the target stack
      --branch-alias=<value>   Specify the branch alias where you want to import your content. If not specified, the
                               content is imported into the main branch by default.
      --module=<option>...     [optional] Specify the modules/module to import into the target stack. currently options
                               are global-fields, content-types, entries
                               <options: global-fields|content-types|entries>

DESCRIPTION
  Helps to generate mappers and backup folder for importing (overwriting) specific modules

ALIASES
  $ csdx cm:import-setup

EXAMPLES
  $ csdx cm:stacks:import-setup --stack-api-key <target_stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>

  $ csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name>

  $ csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name> -b <branch_name>
```

_See code: [src/commands/cm/stacks/import-setup.ts](https://github.com/contentstack/cli/blob/main/packages/contentstack-import-setup/src/commands/cm/stacks/import-setup.ts)_
<!-- commandsstop -->
