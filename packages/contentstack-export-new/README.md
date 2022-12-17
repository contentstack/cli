oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-cm-export
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli-cm-export/1.2.3 darwin-arm64 node-v16.17.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`csdx csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets] --yes`](#csdx-csdx-cmstacksexport--c-value--k-value--d-value--a-value---module-value---content-types-value---branch-value---secured-assets---yes)
* [`csdx cm:stacks:module:base-class`](#csdx-cmstacksmodulebase-class)
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN...`](#csdx-pluginsinstall-plugin-1)
* [`csdx plugins:link PLUGIN`](#csdx-pluginslink-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin-1)
* [`csdx plugins:uninstall PLUGIN...`](#csdx-pluginsuninstall-plugin-2)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets] --yes`

Export content from a stack

```
USAGE
  $ csdx csdx cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>]
    [--content-types <value>] [--branch <value>] [--secured-assets] --yes

FLAGS
  -B, --branch=<value>            [optional] branch name
  -a, --alias=<value>             alias of the management token
  -c, --config=<value>            [optional] path of the config
  -d, --data-dir=<value>          path or location to store the data
  -k, --stack-api-key=<value>     API key of the source stack
  -m, --module=<value>            [optional] specific module name
  -t, --content-types=<value>...  [optional] content type
  -y, --yes                       [optional] Override marketplace apps related prompts
  --secured-assets                [optional] use when assets are secured

DESCRIPTION
  Export content from a stack

ALIASES
  $ csdx cm:stacks:export

EXAMPLES
  $ csdx cm:stacks:export --help

  $ csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>

  $ csdx cm:stacks:export --config <path/to/config/dir>

  $ csdx cm:stacks:export --alias <management_token_alias>

  $ csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>

  $ csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>

  $ csdx cm:stacks:export --module <single module name>

  $ csdx cm:stacks:export --branch [optional] branch name

  $ csdx cm:stacks:export --yes
```

_See code: [dist/commands/cm/stacks/export.ts](https://github.com/***REMOVED***/hello-world/blob/v1.2.3/dist/commands/cm/stacks/export.ts)_

## `csdx cm:stacks:module:base-class`

```
USAGE
  $ csdx cm:stacks:module:base-class
```

_See code: [dist/commands/cm/stacks/module/base-class.ts](https://github.com/***REMOVED***/hello-world/blob/v1.2.3/dist/commands/cm/stacks/module/base-class.ts)_

## `csdx help [COMMAND]`

Display help for csdx.

```
USAGE
  $ csdx help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `csdx plugins`

List installed plugins.

```
USAGE
  $ csdx plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/index.ts)_

## `csdx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ csdx plugins:add

EXAMPLES
  $ csdx plugins:install myplugin 

  $ csdx plugins:install https://github.com/someuser/someplugin

  $ csdx plugins:install someuser/someplugin
```

## `csdx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ csdx plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ csdx plugins:add

EXAMPLES
  $ csdx plugins:install myplugin 

  $ csdx plugins:install https://github.com/someuser/someplugin

  $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/install.ts)_

## `csdx plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ csdx plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/link.ts)_

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/uninstall.ts)_

## `csdx plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove
```

## `csdx plugins:update`

Update installed plugins.

```
USAGE
  $ csdx plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/update.ts)_
<!-- commandsstop -->
