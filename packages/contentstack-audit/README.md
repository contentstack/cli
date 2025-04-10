<!-- Insert Nodejs CI here -->
<!-- Insert Audit version here -->

# @contentstack/cli-audit

Audit plugin

## How to install this plugin

```shell
$ csdx plugins:install @contentstack/cli-audit
```

## How to use this plugin

<!-- usage -->
```sh-session
$ npm install -g @contentstack/cli-audit
$ csdx COMMAND
running command...
$ csdx (--version|-v)
@contentstack/cli-audit/1.11.0 darwin-arm64 node-v22.14.0
$ csdx --help [COMMAND]
USAGE
  $ csdx COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`csdx help [COMMAND]`](#csdx-help-command)
* [`csdx plugins`](#csdx-plugins)
* [`csdx plugins:add PLUGIN`](#csdx-pluginsadd-plugin)
* [`csdx plugins:inspect PLUGIN...`](#csdx-pluginsinspect-plugin)
* [`csdx plugins:install PLUGIN`](#csdx-pluginsinstall-plugin)
* [`csdx plugins:link PATH`](#csdx-pluginslink-path)
* [`csdx plugins:remove [PLUGIN]`](#csdx-pluginsremove-plugin)
* [`csdx plugins:reset`](#csdx-pluginsreset)
* [`csdx plugins:uninstall [PLUGIN]`](#csdx-pluginsuninstall-plugin)
* [`csdx plugins:unlink [PLUGIN]`](#csdx-pluginsunlink-plugin)
* [`csdx plugins:update`](#csdx-pluginsupdate)

## `csdx help [COMMAND]`

Display help for csdx.

```
USAGE
  $ csdx help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for csdx.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.27/src/commands/help.ts)_

## `csdx plugins`

List installed plugins.

```
USAGE
  $ csdx plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ csdx plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/index.ts)_

## `csdx plugins:add PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:add myplugin

  Install a plugin from a github url.

    $ csdx plugins:add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:add someuser/someplugin
```

## `csdx plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ csdx plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ csdx plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/inspect.ts)_

## `csdx plugins:install PLUGIN`

Installs a plugin into csdx.

```
USAGE
  $ csdx plugins:install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into csdx.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CSDX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CSDX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ csdx plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ csdx plugins:install myplugin

  Install a plugin from a github url.

    $ csdx plugins:install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ csdx plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/install.ts)_

## `csdx plugins:link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ csdx plugins:link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ csdx plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/link.ts)_

## `csdx plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:remove myplugin
```

## `csdx plugins:reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ csdx plugins:reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/reset.ts)_

## `csdx plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/uninstall.ts)_

## `csdx plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ csdx plugins:unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ csdx plugins:unlink
  $ csdx plugins:remove

EXAMPLES
  $ csdx plugins:unlink myplugin
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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.36/src/commands/plugins/update.ts)_
<!-- commandsstop -->
